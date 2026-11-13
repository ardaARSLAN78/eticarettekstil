import { requireAdmin, type Context } from "../../graphql/context.js";
import * as service from "./users.service.js";
export const usersResolvers = {
  Query: {
    adminUsers: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listUsers(context, args.filter),
  },
  Mutation: {
    createStaff: (_: unknown, args: { input: unknown }, context: Context) =>
      service.createStaff(context, args.input),
    updateUserAccess: (_: unknown, args: { input: unknown }, context: Context) =>
      service.updateUserAccess(context, args.input),
  },
};
