import { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../core/prisma/index.js";
import { fail } from "../../lib/errors.js";
import { releaseInventory } from "../orders/orders.service.js";

export interface VerifiedPaymentEvent {
  orderId: string;
  provider: string;
  eventKey: string;
  success: boolean;
  amount: number;
  currency: string;
  sandbox: boolean;
  reference?: string;
}

export async function applyPaymentEvent(db: Database, event: VerifiedPaymentEvent) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Order" WHERE id = ${event.orderId} FOR UPDATE`);
    const order = await tx.order.findUnique({ where: { id: event.orderId } });
    if (!order || order.paymentProvider !== event.provider)
      fail("Ödeme siparişi bulunamadı.", "INVALID_PAYMENT");
    if (
      order.paymentSandbox !== event.sandbox ||
      event.currency !== "TRY" ||
      event.amount !== order.total
    )
      fail("Ödeme tutarı, para birimi veya ortamı eşleşmiyor.", "INVALID_PAYMENT");
    if (await tx.paymentEvent.findUnique({ where: { eventKey: event.eventKey } }))
      return "DUPLICATE";
    await tx.paymentEvent.create({ data: { orderId: order.id, eventKey: event.eventKey } });
    if (order.paymentStatus === "PAID" || order.paymentStatus === "REFUND_REQUIRED")
      return "ALREADY_SETTLED";
    if (event.success) {
      if (order.stockReleased || order.status === "CANCELLED") {
        // Süresi dolan rezervasyona geç gelen tahsilat ürün satmış sayılmaz; manuel iade kuyruğuna düşer.
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "REFUND_REQUIRED",
            paymentReference: event.reference,
            buyerIdentityEncrypted: null,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            note: "Rezervasyon kapandıktan sonra ödeme geldi. Sağlayıcıdan iade gerekli.",
          },
        });
        return "REFUND_REQUIRED";
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentReference: event.reference,
          buyerIdentityEncrypted: null,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CONFIRMED",
          note: "Ödeme kuruluşu bildirimi doğrulandı.",
        },
      });
      return "PAID";
    }
    if (order.status === "PENDING_PAYMENT") {
      await releaseInventory(tx, order, "Ödeme kuruluşu işlemi reddetti");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED", buyerIdentityEncrypted: null },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "CANCELLED", note: "Ödeme tamamlanmadı." },
      });
    }
    return "FAILED";
  });
}
