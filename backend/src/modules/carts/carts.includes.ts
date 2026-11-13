import type { Prisma } from "../../generated/prisma/client.js";
import { variantInclude } from "../catalog/catalog.includes.js";
import type { PricingLine } from "../campaigns/pricing.service.js";

export const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          ...variantInclude,
          product: {
            include: { media: { orderBy: { sortOrder: "asc" as const } }, category: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;
type IncludedCart = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
export function toPricingLines(items: IncludedCart["items"]): PricingLine[] {
  return items.map(({ variant: v, quantity }) => ({
    variantId: v.id,
    productId: v.productId,
    categoryId: v.product.categoryId,
    unitPrice: v.price ?? v.product.price,
    quantity,
    taxRateBps: v.product.vatRateBps,
  }));
}
