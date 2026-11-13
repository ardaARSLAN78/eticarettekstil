import type { Database } from "../../core/prisma/index.js";
import { Prisma } from "../../generated/prisma/client.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { reportDaysDto } from "./reports.dto.js";

export async function buildReport(db: Database, days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
    new Date(),
  );
  const start = new Date(`${today}T00:00:00+03:00`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const range = { createdAt: { gte: start } };
  const paid = { ...range, paymentStatus: "PAID" as const, status: { not: "CANCELLED" as const } };
  const [
    products,
    customers,
    subscribers,
    orders,
    revenue,
    statuses,
    recentOrders,
    lowStock,
    series,
    topProducts,
    activeCoupons,
    refunds,
    processing,
  ] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.subscriber.count({ where: { active: true } }),
    db.order.count({ where: range }),
    db.order.aggregate({
      where: paid,
      _sum: { total: true, subtotal: true, shipping: true, discountAmount: true, taxAmount: true },
    }),
    db.order.groupBy({ by: ["status"], where: range, _count: { _all: true } }),
    db.order.findMany({
      where: range,
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        customerName: true,
        email: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    db.$queryRaw<
      {
        id: string;
        name: string;
        sku: string;
        stock: number;
        color: string;
        size: string;
        warehouse: string;
      }[]
    >(
      Prisma.sql`SELECT v.id, p.name, v.sku, v.stock, c.name AS color, s.code AS size, w.name AS warehouse FROM "Variant" v JOIN "Product" p ON p.id = v."productId" JOIN "Color" c ON c.id = v."colorId" JOIN "Size" s ON s.id = v."sizeId" JOIN "Warehouse" w ON w.id = v."warehouseId" WHERE v.active = true AND p.active = true AND v.stock <= v."lowStockThreshold" ORDER BY v.stock ASC LIMIT 20`,
    ),
    db.$queryRaw<{ day: string; revenue: bigint; orders: bigint }[]>(
      Prisma.sql`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS day, SUM(total)::bigint AS revenue, COUNT(*)::bigint AS orders FROM "Order" WHERE "createdAt" >= ${start} AND "paymentStatus" = 'PAID' AND status <> 'CANCELLED' GROUP BY day ORDER BY day`,
    ),
    db.$queryRaw<{ id: string; name: string; quantity: bigint; revenue: bigint }[]>(
      Prisma.sql`SELECT i."productId" AS id, MAX(i.name) AS name, SUM(i.quantity)::bigint AS quantity, SUM(i."unitPrice"::bigint * i.quantity - i."discountAmount")::bigint AS revenue FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE o."createdAt" >= ${start} AND o."paymentStatus" = 'PAID' AND o.status <> 'CANCELLED' GROUP BY i."productId" ORDER BY quantity DESC LIMIT 10`,
    ),
    db.coupon.count({
      where: {
        active: true,
        campaign: { active: true, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
      },
    }),
    db.order.count({ where: { paymentStatus: "REFUND_REQUIRED" } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PREPARING"] } } }),
  ]);
  const daily = new Map(series.map((row) => [row.day, row]));
  const timeline = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86400000);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date);
    return {
      day,
      revenue: Number(daily.get(day)?.revenue ?? 0),
      orders: Number(daily.get(day)?.orders ?? 0),
    };
  });
  return {
    days,
    from: start.toISOString(),
    products,
    customers,
    subscribers,
    orders,
    revenue: revenue._sum.total ?? 0,
    shipping: revenue._sum.shipping ?? 0,
    discountAmount: revenue._sum.discountAmount ?? 0,
    taxAmount: revenue._sum.taxAmount ?? 0,
    activeCoupons,
    refunds,
    processing,
    statuses: statuses.map((row) => ({ status: row.status, count: row._count._all })),
    recentOrders,
    lowStock,
    timeline,
    topProducts: topProducts.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    })),
  };
}

export async function getReport(context: Context, rawDays?: number) {
  requireAdmin(context);
  return buildReport(context.db, reportDaysDto.parse(rawDays));
}
