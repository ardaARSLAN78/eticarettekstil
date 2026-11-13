import { z } from "zod";

export const googleIntegrationDto = z
  .object({ apiKey: z.string().max(250).optional(), enabled: z.boolean() })
  .strict();
