import { z } from "zod";

export const paymentConfigDto = z
  .object({
    provider: z.enum(["IYZICO", "PAYTR", "STRIPE", "BANK_TRANSFER"]),
    enabled: z.boolean(),
    sandbox: z.boolean(),
    secrets: z.record(z.string(), z.string().max(1000)).default({}),
  })
  .strict();
