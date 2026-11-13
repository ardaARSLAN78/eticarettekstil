import { z } from "zod";
import { email, text } from "../../core/sanitizer/index.js";

export const loginDto = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const registerDto = z
  .object({
    name: text(100),
    email,
    password: z.string().min(12, "Şifre en az 12 karakter olmalıdır.").max(128),
  })
  .strict();
