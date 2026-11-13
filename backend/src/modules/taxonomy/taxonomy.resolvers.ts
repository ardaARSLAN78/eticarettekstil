import type { Context } from "../../graphql/context.js";
import * as service from "./taxonomy.service.js";

export const taxonomyResolvers = {
  Query: {
    colors: (_: unknown, __: unknown, c: Context) =>
      c.db.color.findMany({ orderBy: { sortOrder: "asc" } }),
    sizes: (_: unknown, __: unknown, c: Context) =>
      c.db.size.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] }),
    brands: (_: unknown, __: unknown, c: Context) =>
      c.db.brand.findMany({ orderBy: { name: "asc" } }),
    collections: (_: unknown, __: unknown, c: Context) =>
      c.db.collection.findMany({
        where: c.user?.role === "ADMIN" ? {} : { active: true },
        orderBy: { sortOrder: "asc" },
      }),
  },
  Mutation: {
    saveColor: (_: unknown, a: { input: unknown }, c: Context) => service.saveColor(c, a.input),
    saveSize: (_: unknown, a: { input: unknown }, c: Context) => service.saveSize(c, a.input),
    saveBrand: (_: unknown, a: { input: unknown }, c: Context) => service.saveBrand(c, a.input),
    saveCollection: (_: unknown, a: { input: unknown }, c: Context) =>
      service.saveCollection(c, a.input),
  },
};
