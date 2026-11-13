import type { Context } from "../../graphql/context.js";
import * as service from "./settings.service.js";

export const settingsResolvers = {
  Query: {
    settings: (_: unknown, __: unknown, context: Context) => service.getSettings(context.db),
  },
  Mutation: {
    updateSettings: (_: unknown, args: { input: unknown }, context: Context) =>
      service.updateSettings(context, args.input),
  },
};
