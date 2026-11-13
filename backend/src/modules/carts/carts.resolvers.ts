import type { Context } from "../../graphql/context.js";
import * as service from "./carts.service.js";

export const cartsResolvers = {
  Query: { cart: (_: unknown, __: unknown, context: Context) => service.getCart(context) },
  Mutation: {
    setCartItem: (
      _: unknown,
      args: { variantId: string; quantity: number; expectedVersion?: number },
      context: Context,
    ) => service.setCartItem(context, args),
    adjustCartItem: (_: unknown, args: { variantId: string; delta: number }, context: Context) =>
      service.adjustCartItem(context, args),
  },
};
