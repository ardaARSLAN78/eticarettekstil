import { z } from "zod";
import { email, id, text } from "../../core/sanitizer/index.js";
export const userFilterDto = z
  .object({
    search: z.string().trim().max(80).default(""),
    page: z.number().int().min(1).max(10000).default(1),
    role: z.enum(["ADMIN", "CUSTOMER"]).optional(),
  })
  .strict();

export const createStaffDto = z
  .object({
    name: text(100),
    email,
    password: z.string().min(12).max(128),
    currentPassword: z.string().min(1).max(128),
  })
  .strict();
export const userAccessDto = z
  .object({
    id,
    role: z.enum(["ADMIN", "CUSTOMER"]),
    disabled: z.boolean(),
    currentPassword: z.string().min(1).max(128),
  })
  .strict();
