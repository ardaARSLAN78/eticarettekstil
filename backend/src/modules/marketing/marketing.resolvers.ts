import type { Context } from "../../graphql/context.js";
import * as service from "./marketing.service.js";
export const marketingResolvers = {
  Query: {
    adminSubscribers: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listSubscribers(context, args.filter),
  },
  Mutation: {
    disableSubscriber: (_: unknown, args: { id: string }, context: Context) =>
      service.disableSubscriber(context, args.id),
    unsubscribeNewsletter: (_: unknown, args: { token: string }, context: Context) =>
      service.unsubscribe(context, args.token),
  },
};
