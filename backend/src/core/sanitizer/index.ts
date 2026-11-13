import { z } from "zod";

// HTML kabul edilmez; ön yüzde metin olarak render edilir. URL'ler yalnızca güvenli şemaları kabul eder.
export const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v),
      "Kontrol karakteri içeremez.",
    );
export const email = z
  .email()
  .max(100)
  .transform((v) => v.toLowerCase());
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const imageUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) ||
      /^https:\/\/[^\s]+$/i.test(v),
    "Görsel için HTTPS veya yerel /media yolu kullanın.",
  );
export const optionalUrl = z.union([z.literal(""), z.url().startsWith("https://")]);
export const money = z.number().int().min(0).max(100_000_000);
export const id = z.string().min(1).max(100);
