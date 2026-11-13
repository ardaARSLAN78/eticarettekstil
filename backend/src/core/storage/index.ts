import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../config/index.js";

// Depolama yolu kullanıcı girdisinden türetilmez. Docker'da bu dizin kalıcı volume'e bağlıdır.
export const uploadDirectory = resolve(
  import.meta.dirname,
  config.NODE_ENV === "test" ? "../../../tmp/test-uploads" : "../../../uploads",
);

export async function storeImage(key: string, bytes: Buffer) {
  if (!/^[a-f0-9]{64}\.webp$/.test(key)) {
    throw new Error("Geçersiz medya dosya adı.");
  }

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(resolve(uploadDirectory, key), bytes, { flag: "wx" });

  return `/media/uploads/${key}`;
}
