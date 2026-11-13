import { Prisma, type Order } from "../../generated/prisma/client.js";

export async function releaseInventory(tx: Prisma.TransactionClient, order: Order, note: string) {
  if (order.stockReleased) return;
  const items = await tx.orderItem.findMany({
    where: { orderId: order.id },
    orderBy: { variantId: "asc" },
  });
  for (const item of items) {
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity }, version: { increment: 1 } },
    });
    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        delta: item.quantity,
        reason: "RELEASE",
        warehouseId: item.warehouseId,
        orderId: order.id,
        note,
      },
    });
  }
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUND_REQUIRED")
    await tx.campaignRedemption.deleteMany({ where: { orderId: order.id } });
  await tx.order.update({ where: { id: order.id }, data: { stockReleased: true } });
}
