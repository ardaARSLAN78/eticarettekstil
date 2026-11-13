import { Prisma } from "../../generated/prisma/client.js";
import type { Context } from "../../graphql/context.js";
import { decryptSecrets, hashToken } from "../../lib/crypto.js";
import { paymentAdapters } from "../payments/payments.registry.js";
import type { ProviderId } from "../payments/payments.types.js";
import { getSettings } from "../settings/settings.service.js";
import { orderInclude } from "./orders.includes.js";
import { receiptToken } from "./orders.receipt.js";
import { releaseInventory } from "./orders.inventory.service.js";
import { restoreFailedCart } from "./orders.recovery.service.js";
import { fail } from "../../lib/errors.js";

export async function initializePayment(context: Context, orderId: string) {
  const order = await context.db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderInclude,
  });
  const token = receiptToken(order.id);
  if (order.paymentProvider === "DEMO" || order.checkoutUrl || order.status !== "PENDING_PAYMENT")
    return { order, receiptToken: token, paymentUrl: order.checkoutUrl };
  const settings = await getSettings(context.db);
  const adapter = paymentAdapters[order.paymentProvider as ProviderId];
  try {
    const result = await adapter.start({
      order,
      settings,
      sandbox: order.paymentSandbox,
      secrets: order.paymentConfigEncrypted ? decryptSecrets(order.paymentConfigEncrypted) : {},
      identityNumber: order.buyerIdentityEncrypted
        ? decryptSecrets(order.buyerIdentityEncrypted).identityNumber
        : undefined,
      ip: context.request.ip ?? "127.0.0.1",
      receiptToken: token,
    });
    const updated = await context.db.order.update({
      where: { id: order.id },
      data: {
        checkoutUrl: result.url,
        paymentTokenHash: result.token ? hashToken(result.token) : null,
        paymentReference: result.reference,
      },
      include: orderInclude,
    });
    return { order: updated, receiptToken: token, paymentUrl: result.url };
  } catch {
    // Başlatma başarısızlığında rezervasyon yalnızca bir kere geri bırakılır.
    const restored = await context.db.$transaction(async (tx) => {
      // Checkout ile aynı kilit sırası: sepet → sipariş → varyant.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Cart" WHERE id = ${order.cartId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`);
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (current.status !== "PENDING_PAYMENT") return false;
      await releaseInventory(tx, current, "Ödeme başlatılamadı");
      await restoreFailedCart(tx, current);
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED", buyerIdentityEncrypted: null },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: "Ödeme oturumu başlatılamadı; tahsilat yapılmadı.",
        },
      });
      return true;
    });
    if (!restored) {
      const latest = await context.db.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });
      if (latest.paymentStatus === "PAID")
        return { order: latest, receiptToken: token, paymentUrl: null };
    }
    fail(
      restored
        ? "Ödeme oturumu açılamadı. Ürünleriniz sepetinizde korundu; yeniden deneyebilirsiniz."
        : "Ödeme oturumu açılamadı. Sipariş durumunu kontrol edip yeniden deneyin.",
      "PAYMENT_FAILED",
    );
  }
}
