import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { enforceLimit } from "../../core/redis/index.js";
import type { Context } from "../../graphql/context.js";
import { encryptSecrets, hashToken } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { calculateQuote } from "../campaigns/pricing.service.js";
import { cartInclude, toPricingLines } from "../carts/carts.includes.js";
import { getCartIdentity } from "../carts/carts.service.js";
import { getPaymentConfiguration } from "../payments/payments.service.js";
import { getSettings } from "../settings/settings.service.js";
import { checkoutDto } from "./orders.dto.js";
import { orderInclude } from "./orders.includes.js";
import { receiptToken } from "./orders.receipt.js";
import { initializePayment } from "./orders.payment.service.js";

export async function checkout(context: Context, raw: unknown) {
  const input = checkoutDto.parse(raw);
  await enforceLimit(`checkout:${context.request.ip}`, 30, 900);
  const cartId = await getCartIdentity(context);
  const settings = await getSettings(context.db);
  const payment = await getPaymentConfiguration(context.db, input.paymentProvider);
  const created = await context.db.$transaction(
    async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`);
      const existing = await tx.order.findUnique({
        where: { cartId_idempotencyKey: { cartId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return { id: existing.id, fresh: false };
      const cart = await tx.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
      if (!cart.items.length) fail("Sepetiniz boş.");
      for (const { variant: v, quantity } of cart.items) {
        if (!v.active || !v.product.active || !v.product.category.active || v.stock < quantity)
          fail("Sepetinizdeki bir ürün satışa uygun değil veya stoğu yetersiz.", "OUT_OF_STOCK");
      }
      // Kampanya kullanım sınırları aynı kampanyayı kullanan paralel siparişlerde de korunur.
      await tx.$queryRaw`SELECT id FROM "Campaign" WHERE active = true ORDER BY id FOR UPDATE`;
      const quote = await calculateQuote(
        tx,
        toPricingLines(cart.items),
        settings,
        cart.couponCode,
        input.email,
        true,
      );
      if (quote.total < 100 || quote.total > 100_000_000)
        fail("Sipariş tutarı izin verilen sınırlar dışında.");
      const orderId = randomUUID().replaceAll("-", "");
      const token = receiptToken(orderId);
      const demo = input.paymentProvider === "DEMO";
      const order = await tx.order.create({
        data: {
          id: orderId,
          number: `Q${new Date().toISOString().slice(2, 10).replaceAll("-", "")}${randomBytes(4).toString("hex").toUpperCase()}`,
          receiptTokenHash: hashToken(token),
          idempotencyKey: input.idempotencyKey,
          cartId,
          userId: context.user?.id,
          email: input.email,
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
          city: input.city,
          district: input.district,
          postalCode: input.postalCode,
          billingDetails: input.billingDetails,
          subtotal: quote.subtotal,
          shipping: quote.shipping,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          total: quote.total,
          couponCode: cart.couponCode,
          status: demo ? "CONFIRMED" : "PENDING_PAYMENT",
          paymentStatus: demo ? "DEMO" : "PENDING",
          paymentProvider: input.paymentProvider,
          paymentSandbox: payment.sandbox,
          paymentConfigEncrypted: payment.encrypted,
          buyerIdentityEncrypted: input.identityNumber
            ? encryptSecrets({ identityNumber: input.identityNumber })
            : null,
          paymentExpiresAt: demo
            ? null
            : new Date(
                Date.now() + (input.paymentProvider === "BANK_TRANSFER" ? 24 * 60 : 30) * 60000,
              ),
          items: {
            create: cart.items.map(({ variant: v, quantity }, index) => ({
              productId: v.productId,
              variantId: v.id,
              warehouseId: v.warehouseId,
              name: v.product.name,
              image: v.product.media[0]?.url ?? "",
              color: v.colorInfo.name,
              size: v.sizeInfo.code,
              sku: v.sku,
              unitPrice: v.price ?? v.product.price,
              quantity,
              taxRateBps: v.product.vatRateBps,
              discountAmount: quote.lines[index]!.discountAmount,
              taxAmount: quote.lines[index]!.taxAmount,
            })),
          },
          history: {
            create: {
              status: demo ? "CONFIRMED" : "PENDING_PAYMENT",
              note: demo ? "Demo sipariş; gerçek tahsilat yapılmadı." : "Ödeme bekleniyor.",
            },
          },
        },
      });
      for (const item of [...cart.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        const updated = await tx.variant.updateMany({
          where: {
            id: item.variantId,
            active: true,
            warehouseId: item.variant.warehouseId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity }, version: { increment: 1 } },
        });
        if (updated.count !== 1)
          fail("Ürün stoğu değişti. Sepetinizi kontrol edin.", "OUT_OF_STOCK");
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            delta: -item.quantity,
            reason: "RESERVATION",
            warehouseId: item.variant.warehouseId,
            orderId: order.id,
          },
        });
      }
      if (quote.campaign)
        await tx.campaignRedemption.create({
          data: {
            campaignId: quote.campaign.campaignId,
            couponId: quote.campaign.couponId,
            orderId: order.id,
            emailHash: hashToken(input.email),
            amount: quote.discountAmount,
          },
        });
      await tx.cartItem.deleteMany({ where: { cartId } });
      await tx.cart.update({
        where: { id: cartId },
        data: { couponCode: null, version: { increment: 1 } },
      });
      return { id: order.id, fresh: true };
    },
    { timeout: 15000 },
  );
  if (!created.fresh) {
    const order = await context.db.order.findUniqueOrThrow({
      where: { id: created.id },
      include: orderInclude,
    });
    return { order, receiptToken: receiptToken(order.id), paymentUrl: order.checkoutUrl };
  }
  return initializePayment(context, created.id);
}

export async function retryPayment(context: Context, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) fail("Sipariş bağlantısı geçersiz.");
  const order = await context.db.order.findUnique({
    where: { receiptTokenHash: hashToken(token) },
  });
  if (
    !order ||
    order.status !== "PENDING_PAYMENT" ||
    (order.paymentExpiresAt && order.paymentExpiresAt < new Date())
  )
    fail("Bu sipariş için ödeme oturumu açılamıyor.");
  await enforceLimit(`payment-retry:${order.id}`, 5, 600);
  // İlk başlatma hâlâ sürüyorsa ikinci bir oturum/rezervasyon oluşturulmaz.
  if (!order.checkoutUrl && order.paymentProvider !== "BANK_TRANSFER")
    fail("Ödeme oturumu hazırlanıyor. Birkaç saniye sonra tekrar deneyin.");
  return {
    order: await context.db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderInclude,
    }),
    receiptToken: token,
    paymentUrl: order.checkoutUrl,
  };
}
