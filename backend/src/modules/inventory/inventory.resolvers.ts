import { requireAdmin, type Context } from "../../graphql/context.js";
import * as service from "./inventory.service.js";
export const inventoryResolvers = {
  Query: {
    adminInventory: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listInventory(context, args.filter),
    adminWarehouses: (_: unknown, __: unknown, context: Context) => {
      requireAdmin(context);
      return context.db.warehouse.findMany({ orderBy: { name: "asc" } });
    },
  },
  Mutation: {
    updateInventory: (_: unknown, args: { input: unknown }, context: Context) =>
      service.updateInventory(context, args.input),
    saveWarehouse: (_: unknown, args: { input: unknown }, context: Context) =>
      service.saveWarehouse(context, args.input),
  },
};
