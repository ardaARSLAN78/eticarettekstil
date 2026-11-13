import { z } from "zod";
import { id, text } from "../../core/sanitizer/index.js";

export const addressDto = z
  .object({
    id: id.optional(),
    label: text(50),
    fullName: text(100),
    phone: text(25),
    address: text(500).min(10),
    city: text(80),
    district: text(80),
    postalCode: z.string().regex(/^\d{5}$/),
    isDefault: z.boolean(),
  })
  .strict();
