import { requireAdmin, type Context } from "../../graphql/context.js";
import { internalPath } from "./seo.dto.js";
import * as service from "./seo.service.js";

export const seoResolvers = {
  Query: {
    seoEntries: (_: unknown, __: unknown, c: Context) => service.seoEntries(c),
    resolveRedirect: async (_: unknown, a: { path: string }, c: Context) =>
      (await c.db.redirect.findUnique({ where: { fromPath: internalPath.parse(a.path) } }))
        ?.toPath ?? null,
    adminRedirects: (_: unknown, __: unknown, c: Context) => {
      requireAdmin(c);
      return c.db.redirect.findMany({ take: 500, orderBy: { createdAt: "desc" } });
    },
  },
  Mutation: {
    saveRedirect: (_: unknown, a: { input: unknown }, c: Context) =>
      service.saveRedirect(c, a.input),
  },
};
