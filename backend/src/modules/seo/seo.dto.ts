import { z } from "zod";

export const internalPath = z
  .string()
  .max(300)
  .regex(/^\/(?!\/)[a-zA-Z0-9/_.-]*$/, "Site içi bir adres girin.")
  .refine((p) => !p.includes(".."), "Üst dizin adresi kullanılamaz.");
export const redirectDto = z
  .object({ fromPath: internalPath, toPath: internalPath })
  .strict()
  .refine((r) => r.fromPath !== r.toPath, "Adresler aynı olamaz.");
