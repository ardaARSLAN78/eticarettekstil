import type { Context } from "../../graphql/context.js";
import * as service from "./auth.service.js";

export const authResolvers = {
  Query: { me: (_: unknown, __: unknown, context: Context) => context.user },
  Mutation: {
    login: (_: unknown, args: { input: unknown }, context: Context) =>
      service.login(context, args.input),
    register: (_: unknown, args: { input: unknown }, context: Context) =>
      service.register(context, args.input),
    logout: (_: unknown, __: unknown, context: Context) => service.logout(context),
  },
};
