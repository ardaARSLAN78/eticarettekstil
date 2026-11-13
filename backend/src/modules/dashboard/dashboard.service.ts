import { requireAdmin, type Context } from "../../graphql/context.js";

export async function dashboard(context: Context) {
  requireAdmin(context);
  const [products, orders, subscribers, pending, revenue, lowStock, refunds] = await Promise.all([
    context.db.product.count(),
    context.db.order.count(),
    context.db.subscriber.count(),
    context.db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    context.db.order.aggregate({
      where: { paymentStatus: "PAID", status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    context.db.variant.findMany({
      where: { active: true, stock: { lte: 3 } },
      include: { product: { select: { name: true } }, colorInfo: true, sizeInfo: true },
      take: 20,
      orderBy: { stock: "asc" },
    }),
    context.db.order.count({ where: { paymentStatus: "REFUND_REQUIRED" } }),
  ]);
  return {
    products,
    orders,
    subscribers,
    pending,
    revenue: revenue._sum.total ?? 0,
    refunds,
    lowStock: lowStock.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.product.name,
      color: v.colorInfo.name,
      size: v.sizeInfo.code,
      stock: v.stock,
    })),
  };
}
