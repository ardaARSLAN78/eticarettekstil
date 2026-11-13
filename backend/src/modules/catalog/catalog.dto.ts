import { z } from "zod";
import { id, imageUrl, money, slug, text } from "../../core/sanitizer/index.js";

export const seoFields = {
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(180).nullable().optional(),
  canonicalUrl: z.url().startsWith("https://").nullable().optional(),
  noIndex: z.boolean().default(false),
};

export const categoryDto = z
  .object({
    id: id.optional(),
    name: text(80),
    slug,
    image: imageUrl,
    sortOrder: z.number().int().min(0).max(1000),
    description: z.string().max(3000).default(""),
    parentId: id.nullable().optional(),
    active: z.boolean().default(true),
    ...seoFields,
  })
  .strict();

export const variantDto = z
  .object({
    id: id.optional(),
    expectedVersion: z.number().int().min(0).optional(),
    colorId: id,
    sizeId: id,
    sku: z.string().regex(/^[A-Za-z0-9_-]{3,80}$/),
    stock: z.number().int().min(0).max(1_000_000),
    barcode: z
      .string()
      .regex(/^\d{8,14}$/)
      .nullable()
      .optional(),
    price: money.min(100).nullable().optional(),
    lowStockThreshold: z.number().int().min(0).max(10000).default(3),
    active: z.boolean().default(true),
  })
  .strict();

export const productDto = z
  .object({
    id: id.optional(),
    slug,
    name: text(150),
    subtitle: text(180),
    description: text(6000),
    material: text(1000),
    care: text(1000),
    price: money.min(100),
    compareAtPrice: money.nullable().optional(),
    images: z
      .array(
        z.union([
          imageUrl.transform((url) => ({
            url,
            alt: "",
            sortOrder: 0,
            colorId: null as string | null,
          })),
          z.object({
            url: imageUrl,
            alt: z.string().max(200),
            sortOrder: z.number().int().min(0).max(100),
            colorId: id.nullable().optional(),
          }),
        ]),
      )
      .min(1)
      .max(10),
    badge: z.string().max(40).nullable().optional(),
    active: z.boolean(),
    featured: z.boolean(),
    categoryId: id,
    brandId: id.nullable().optional(),
    collectionIds: z.array(id).max(30).default([]),
    vatRateBps: z.number().int().min(0).max(10000).default(0),
    weightGrams: z.number().int().min(0).max(100000).default(0),
    ogImage: imageUrl.nullable().optional(),
    ...seoFields,
    variants: z.array(variantDto).min(1).max(120),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.compareAtPrice != null && p.compareAtPrice <= p.price)
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "Eski fiyat satış fiyatından büyük olmalıdır.",
      });
    if (new Set(p.variants.map((v) => `${v.colorId}:${v.sizeId}`)).size !== p.variants.length)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Aynı renk/beden tekrarlanamaz.",
      });
    if (new Set(p.variants.map((v) => v.sku)).size !== p.variants.length)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "SKU değerleri benzersiz olmalıdır.",
      });
  });

export const filterDto = z
  .object({
    category: slug.optional(),
    collection: slug.optional(),
    search: z.string().trim().max(80).optional(),
    featured: z.boolean().optional(),
    sort: z.enum(["NEWEST", "PRICE_ASC", "PRICE_DESC", "FEATURED"]).default("FEATURED"),
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(48).default(12),
  })
  .strict();
