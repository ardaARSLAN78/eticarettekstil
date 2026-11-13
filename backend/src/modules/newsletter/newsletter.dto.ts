import { z } from "zod";
import { email } from "../../core/sanitizer/index.js";

export const newsletterDto = z
  .object({ email, consent: z.literal(true, "Bülten izni verilmelidir.") })
  .strict();
