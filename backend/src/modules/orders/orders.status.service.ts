import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import { id, imageUrl, text } from "../../core/sanitizer/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { orderStatusDto } from "./orders.dto.js";
import { orderInclude } from "./orders.includes.js";
import { releaseInventory } from "./orders.inventory.service.js";

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateOrderStatus(
  context: Context,
  args: {
    id: string;
    status: string;
    trackingNumber?: string | null;
    shippingCarrier?: string | null;
  },
) {
  const admin = requireAdmin(context);
  const orderId = id.parse(args.id);
  const status = orderStatusDto.parse(args.status);
  const trackingNumber = args.trackingNumber ? text(100).parse(args.trackingNumber) : null;
  const shippingCarrier = args.shippingCarrier ? text(100).parse(args.shippingCarrier) : null;
  return context.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (!transitions[order.status]?.includes(status))
      fail("Bu sipariş durumu geçişine izin verilmiyor.");
    if (
      status === "CONFIRMED" &&
      order.status === "PENDING_PAYMENT" &&
      order.paymentProvider !== "BANK_TRANSFER"
    )
      fail("Kart ödemeleri yalnızca doğrulanmış sağlayıcı bildirimiyle onaylanabilir.");
    if (status === "CONFIRMED" && order.paymentExpiresAt && order.paymentExpiresAt < new Date())
      fail("Ödeme süresi dolmuş sipariş onaylanamaz.");
    if (status === "SHIPPED" && (!trackingNumber || !shippingCarrier))
      fail("Kargoya verirken kargo firması ve takip numarası girin.");
    if (status === "CANCELLED") await releaseInventory(tx, order, "Yönetici iptali");
    const paymentStatus =
      status === "CONFIRMED" && order.paymentProvider === "BANK_TRANSFER"
        ? "PAID"
        : status === "CANCELLED" && order.paymentStatus === "PAID"
          ? "REFUND_REQUIRED"
          : order.paymentStatus;
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        paymentStatus,
        ...(status === "SHIPPED" ? { trackingNumber, shippingCarrier } : {}),
        ...(status === "CONFIRMED" || status === "CANCELLED"
          ? { buyerIdentityEncrypted: null }
          : {}),
      },
      include: orderInclude,
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status,
        actorId: admin.id,
        note:
          status === "CANCELLED" && paymentStatus === "REFUND_REQUIRED"
            ? "İptal edildi. Sağlayıcı üzerinden iade yapılmalıdır."
            : null,
      },
    });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: `ORDER_${status}`, entityId: orderId },
    });
    return updated;
  });
}

export async function updateInvoice(
  context: Context,
  args: { id: string; invoiceNumber: string; invoiceUrl: string },
) {
  const admin = requireAdmin(context);
  const parsed = z
    .object({
      id,
      invoiceNumber: text(100),
      invoiceUrl: imageUrl.refine(
        (v) => v.startsWith("https://"),
        "Fatura için HTTPS bağlantısı gereklidir.",
      ),
    })
    .strict()
    .parse(args);
  return context.db.$transaction(async (tx) => {
    const row = await tx.order.update({
      where: { id: parsed.id },
      data: { invoiceNumber: parsed.invoiceNumber, invoiceUrl: parsed.invoiceUrl },
      include: orderInclude,
    });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "INVOICE_UPDATED", entityId: row.id },
    });
    return row;
  });
}
