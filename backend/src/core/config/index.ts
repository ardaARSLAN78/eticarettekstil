import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  HOST: z.string().default("127.0.0.1"),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  PUBLIC_API_URL: z.url().default("http://localhost:4100"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  ENABLE_DEMO_PAYMENT: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  TRUST_PROXY: z.string().default("false"),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  // Gizli değerler hata mesajına veya log dosyasına taşınmaz.
  throw new Error(
    `Ortam ayarları geçersiz: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
}

export const config = result.data;
export const production = config.NODE_ENV === "production";

if (
  production &&
  (config.ENABLE_DEMO_PAYMENT ||
    !config.REDIS_URL ||
    !config.WEB_ORIGIN.startsWith("https://") ||
    !config.PUBLIC_API_URL.startsWith("https://"))
) {
  throw new Error("Üretimde HTTPS, Redis ve kapalı demo ödeme zorunludur.");
}

export const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: production,
  sameSite: "lax" as const,
};
