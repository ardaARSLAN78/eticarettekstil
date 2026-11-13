import type { Prisma, Order } from "../../generated/prisma/client.js";

/** Çağıran işlem önce sepeti kilitler; ödeme beklerken eklenen ürünler ezilmez. */
export async function restoreFailedCart(tx: Prisma.TransactionClient, order: Order) {
  const cart = await tx.cart.findUniqueOrThrow({ where: { id: order.cartId } });
  const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
  for (const item of items) {
    const where = { cartId_variantId: { cartId: order.cartId, variantId: item.variantId } };
    const existing = await tx.cartItem.findUnique({ where });
    await tx.cartItem.upsert({
      where,
      create: { cartId: order.cartId, variantId: item.variantId, quantity: item.quantity },
      update: { quantity: Math.min(10, (existing?.quantity ?? 0) + item.quantity) },
    });
  }
  await tx.cart.update({
    where: { id: order.cartId },
    data: {
      couponCode: cart.couponCode ?? order.couponCode,
      version: { increment: 1 },
    },
  });
}
