import { z } from "zod";
import { id } from "../../core/sanitizer/index.js";

export const setCartItemDto = z
  .object({
    variantId: id,
    quantity: z.number().int().min(0).max(10),
    expectedVersion: z.number().int().min(0).optional(),
  })
  .strict();

export const adjustCartItemDto = z
  .object({
    variantId: id,
    delta: z
      .number()
      .int()
      .min(-10)
      .max(10)
      .refine((value) => value !== 0),
  })
  .strict();
