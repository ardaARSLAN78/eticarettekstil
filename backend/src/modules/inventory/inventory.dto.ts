import { z } from "zod";
import { id, text } from "../../core/sanitizer/index.js";
export const inventoryFilterDto = z
  .object({
    search: z.string().trim().max(80).default(""),
    page: z.number().int().min(1).max(10000).default(1),
    warehouseId: id.optional(),
    lowOnly: z.boolean().default(false),
  })
  .strict();
export const stockDto = z
  .object({
    variantId: id,
    stock: z.number().int().min(0).max(1_000_000),
    expectedVersion: z.number().int().min(0),
    warehouseId: id,
    note: text(300).min(4),
  })
  .strict();
export const warehouseDto = z
  .object({
    id: id.optional(),
    name: text(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{1,20}$/),
    address: z.string().max(500).default(""),
    active: z.boolean(),
  })
  .strict();
