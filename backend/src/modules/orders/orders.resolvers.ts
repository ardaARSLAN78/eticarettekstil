import { z } from "zod";
import { requireAdmin, requireUser, type Context } from "../../graphql/context.js";
import { hashToken } from "../../lib/crypto.js";
import { orderInclude } from "./orders.includes.js";
import * as service from "./orders.service.js";

export const ordersResolvers = {
  Query: {
    myOrders: (_: unknown, __: unknown, c: Context) =>
      c.db.order.findMany({
        where: { userId: requireUser(c).id },
        orderBy: { createdAt: "desc" },
        include: orderInclude,
        take: 100,
      }),
    orderReceipt: (_: unknown, a: { token: string }, c: Context) => {
      if (!/^[a-f0-9]{64}$/.test(a.token)) return null;
      return c.db.order.findUnique({
        where: { receiptTokenHash: hashToken(a.token) },
        include: orderInclude,
      });
    },
    adminOrders: (_: unknown, a: { page?: number }, c: Context) => {
      requireAdmin(c);
      const page = z
        .number()
        .int()
        .min(1)
        .max(10000)
        .parse(a.page ?? 1);
      return c.db.order.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 50,
        take: 50,
        include: orderInclude,
      });
    },
  },
  Mutation: {
    checkout: (_: unknown, a: { input: unknown }, c: Context) => service.checkout(c, a.input),
    retryPayment: (_: unknown, a: { token: string }, c: Context) =>
      service.retryPayment(c, a.token),
    updateOrderStatus: (
      _: unknown,
      a: Parameters<typeof service.updateOrderStatus>[1],
      c: Context,
    ) => service.updateOrderStatus(c, a),
    updateInvoice: (_: unknown, a: Parameters<typeof service.updateInvoice>[1], c: Context) =>
      service.updateInvoice(c, a),
  },
  Order: { createdAt: (o: { createdAt: Date }) => o.createdAt.toISOString() },
  OrderHistory: { createdAt: (o: { createdAt: Date }) => o.createdAt.toISOString() },
};
