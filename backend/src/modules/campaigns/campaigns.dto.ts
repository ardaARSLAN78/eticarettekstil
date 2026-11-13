import { z } from "zod";
import { id, money, slug, text } from "../../core/sanitizer/index.js";

export const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,30}$/, "Kupon kodu 3–30 harf/rakam içermelidir.");

export const campaignDto = z
  .object({
    id: id.optional(),
    name: text(120),
    slug,
    description: z.string().max(1000).default(""),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    value: z.number().int().min(1).max(100_000_000),
    active: z.boolean(),
    automatic: z.boolean(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    minimumSubtotal: money.default(0),
    maximumDiscount: money.min(1).nullable().optional(),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
    perEmailLimit: z.number().int().min(1).max(1000).nullable().optional(),
    productIds: z.array(id).max(500).default([]),
    categoryIds: z.array(id).max(100).default([]),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.endsAt <= c.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Bitiş tarihi başlangıçtan sonra olmalıdır.",
      });
    if (c.type === "PERCENTAGE" && c.value > 10000)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Yüzde değeri 1–10000 baz puan arasında olmalıdır. 1000 = %10.",
      });
  });

export const couponDto = z
  .object({
    id: id.optional(),
    code: couponCode,
    campaignId: id,
    active: z.boolean(),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  })
  .strict();
