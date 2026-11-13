import type { Context } from "../../graphql/context.js";
import * as service from "./customers.service.js";
export const customersResolvers = {
  Query: {
    adminCustomers: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listCustomers(context, args.filter),
    adminCustomer: (_: unknown, args: { id: string }, context: Context) =>
      service.customerDetail(context, args.id),
  },
};
