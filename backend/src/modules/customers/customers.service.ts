import { requireAdmin, type Context } from "../../graphql/context.js";
import { id } from "../../core/sanitizer/index.js";
import { customerFilterDto } from "./customers.dto.js";

export async function listCustomers(context: Context, raw: unknown) {
  requireAdmin(context);
  const filter = customerFilterDto.parse(raw ?? {});
  const where = {
    role: "CUSTOMER" as const,
    ...(filter.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" as const } },
            { email: { contains: filter.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    context.db.user.findMany({
      where,
      skip: (filter.page - 1) * 25,
      take: 25,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        disabled: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    context.db.user.count({ where }),
  ]);
  const totals = await context.db.order.groupBy({
    by: ["userId"],
    where: {
      userId: { in: users.map((user) => user.id) },
      paymentStatus: "PAID",
      status: { not: "CANCELLED" },
    },
    _sum: { total: true },
  });
  const amounts = new Map(totals.map((row) => [row.userId, row._sum.total ?? 0]));
  return {
    items: users.map(({ _count, ...user }) => ({
      ...user,
      orders: _count.orders,
      totalSpent: amounts.get(user.id) ?? 0,
    })),
    total,
    page: filter.page,
    pages: Math.max(1, Math.ceil(total / 25)),
  };
}

export async function customerDetail(context: Context, raw: string) {
  requireAdmin(context);
  return context.db.user.findFirst({
    where: { id: id.parse(raw), role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      disabled: true,
      createdAt: true,
      addresses: true,
      orders: {
        take: 50,
        orderBy: { createdAt: "desc" },
        select: { number: true, status: true, paymentStatus: true, total: true, createdAt: true },
      },
    },
  });
}
