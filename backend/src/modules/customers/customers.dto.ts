import { z } from "zod";
export const customerFilterDto = z
  .object({
    search: z.string().trim().max(80).default(""),
    page: z.number().int().min(1).max(10000).default(1),
  })
  .strict();
