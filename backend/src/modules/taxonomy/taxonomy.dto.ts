import { z } from "zod";
import { id, imageUrl, slug, text } from "../../core/sanitizer/index.js";
import { seoFields } from "../catalog/catalog.dto.js";

export const colorDto = z
  .object({
    id: id.optional(),
    name: text(50),
    slug,
    hex: z.string().regex(/^#[A-Fa-f0-9]{6}$/),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .strict();
export const sizeDto = z
  .object({
    id: id.optional(),
    label: text(50),
    code: text(12),
    group: z.enum(["CLOTHING", "FOOTWEAR", "ACCESSORY"]),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .strict();
export const brandDto = z
  .object({
    id: id.optional(),
    name: text(80),
    slug,
    description: z.string().max(3000).default(""),
    logo: imageUrl.nullable().optional(),
  })
  .strict();
export const collectionDto = z
  .object({
    id: id.optional(),
    name: text(100),
    slug,
    description: z.string().max(3000).default(""),
    image: imageUrl,
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(1000).default(0),
    ...seoFields,
  })
  .strict();
