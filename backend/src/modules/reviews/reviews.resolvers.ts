import { requireAdmin, type Context } from "../../graphql/context.js";
import * as service from "./reviews.service.js";

export const reviewsResolvers = {
  Query: {
    googleReviews: (_: unknown, __: unknown, c: Context) => service.googleReviews(c),
    adminGoogleIntegration: async (_: unknown, __: unknown, c: Context) => {
      requireAdmin(c);
      const row = await c.db.integrationConfig.findUnique({ where: { provider: "GOOGLE_PLACES" } });
      return { configured: Boolean(row), enabled: row?.enabled ?? false };
    },
  },
  Mutation: {
    saveGoogleIntegration: (_: unknown, a: { input: unknown }, c: Context) =>
      service.saveGoogleIntegration(c, a.input),
  },
};
