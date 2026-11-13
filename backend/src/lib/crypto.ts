import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { config } from "../core/config/index.js";

const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

export const opaqueToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, key] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !key) return false;
  const derived = await derive(password, salt);
  return safeEqual(derived.toString("hex"), key);
}

// Ödeme anahtarları AES-256-GCM ile doğrulanarak şifrelenir; ana anahtar yalnızca ortamda tutulur.
export function encryptSecrets(data: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

export function decryptSecrets(encrypted: string): Record<string, string> {
  const [iv, tag, data] = encrypted.split(".").map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !data) throw new Error("Şifreli ayar biçimi geçersiz.");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(config.ENCRYPTION_KEY, "hex"), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
}
