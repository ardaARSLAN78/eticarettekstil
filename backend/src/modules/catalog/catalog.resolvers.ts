import type { Context } from "../../graphql/context.js";
import { slug } from "../../core/sanitizer/index.js";
import * as service from "./catalog.service.js";
import { productInclude, variantInclude } from "./catalog.includes.js";

export const catalogResolvers = {
  Query: {
    categories: (_: unknown, __: unknown, context: Context) =>
      context.db.category.findMany({
        where: context.user?.role === "ADMIN" ? {} : { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    products: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listProducts(context, args.filter),
    adminProducts: (_: unknown, args: { filter?: unknown }, context: Context) =>
      service.listProducts(context, args.filter, true),
    product: (_: unknown, args: { slug: string }, context: Context) =>
      context.db.product.findFirst({
        where: { slug: slug.parse(args.slug), active: true, category: { active: true } },
        include: {
          ...productInclude,
          variants: { include: variantInclude, where: { active: true } },
        },
      }),
  },
  Mutation: {
    saveCategory: (_: unknown, args: { input: unknown }, context: Context) =>
      service.saveCategory(context, args.input),
    deleteCategory: (_: unknown, args: { id: string }, context: Context) =>
      service.deleteCategory(context, args.id),
    saveProduct: (_: unknown, args: { input: unknown }, context: Context) =>
      service.saveProduct(context, args.input),
    archiveProduct: (_: unknown, args: { id: string }, context: Context) =>
      service.archiveProduct(context, args.id),
  },
  Product: {
    images: (product: { media: { url: string }[] }) => product.media.map((image) => image.url),
  },
  Variant: {
    color: (variant: { colorInfo: { name: string } }) => variant.colorInfo.name,
    colorHex: (variant: { colorInfo: { hex: string } }) => variant.colorInfo.hex,
    size: (variant: { sizeInfo: { code: string } }) => variant.sizeInfo.code,
  },
};
