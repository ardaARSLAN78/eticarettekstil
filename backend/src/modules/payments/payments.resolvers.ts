import type { Context } from "../../graphql/context.js";
import * as service from "./payments.service.js";

export const paymentsResolvers = {
  Query: {
    paymentMethods: (_: unknown, __: unknown, c: Context) => service.paymentMethods(c.db),
    adminPaymentProviders: (_: unknown, __: unknown, c: Context) =>
      service.adminPaymentProviders(c),
  },
  Mutation: {
    savePaymentProvider: (_: unknown, a: { input: unknown }, c: Context) =>
      service.savePaymentProvider(c, a.input),
  },
};
