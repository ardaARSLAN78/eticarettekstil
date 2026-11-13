import { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../core/prisma/index.js";
import { releaseInventory } from "./orders.inventory.service.js";

export async function expireUnpaidOrders(db: Database) {
  const candidates = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", paymentExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });
  for (const candidate of candidates)
    await db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Order" WHERE id = ${candidate.id} FOR UPDATE`);
      const order = await tx.order.findUniqueOrThrow({ where: { id: candidate.id } });
      if (
        order.status !== "PENDING_PAYMENT" ||
        !order.paymentExpiresAt ||
        order.paymentExpiresAt > new Date()
      )
        return;
      await releaseInventory(tx, order, "Ödeme süresi doldu");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED", buyerIdentityEncrypted: null },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: "Ödeme süresi doldu; stok serbest bırakıldı.",
        },
      });
    });
  return candidates.length;
}
