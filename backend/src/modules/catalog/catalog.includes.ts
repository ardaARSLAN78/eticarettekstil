import type { Prisma } from "../../generated/prisma/client.js";

export const variantInclude = { colorInfo: true, sizeInfo: true } satisfies Prisma.VariantInclude;
export const productInclude = {
  category: true,
  brand: true,
  collections: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  variants: { include: variantInclude, orderBy: { id: "asc" as const } },
} satisfies Prisma.ProductInclude;
