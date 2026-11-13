import { requireUser, type Context } from "../../graphql/context.js";
import * as service from "./account.service.js";

export const accountResolvers = {
  Query: {
    myAddresses: (_: unknown, __: unknown, c: Context) =>
      c.db.customerAddress.findMany({
        where: { userId: requireUser(c).id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
  },
  Mutation: {
    saveAddress: (_: unknown, a: { input: unknown }, c: Context) => service.saveAddress(c, a.input),
    deleteAddress: (_: unknown, a: { id: string }, c: Context) => service.deleteAddress(c, a.id),
  },
};
