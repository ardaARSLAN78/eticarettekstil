import { z } from "zod";
export const subscriberFilterDto = z
  .object({
    search: z.string().trim().max(100).default(""),
    page: z.number().int().min(1).max(10000).default(1),
    activeOnly: z.boolean().default(false),
  })
  .strict();
