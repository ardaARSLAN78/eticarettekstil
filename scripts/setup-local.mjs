import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Mevcut ayarlar korunur; yerel yönetici için ortak/varsayılan şifre kullanılmaz.
const root = resolve(import.meta.dirname, "..");
const key = randomBytes(32).toString("hex");
const password = `Q!${randomBytes(18).toString("base64url")}`;
for (const folder of ["backend", "frontend", "."]) {
  const target = resolve(root, folder, ".env");
  if (existsSync(target)) continue;
  const example = readFileSync(resolve(root, folder, ".env.example"), "utf8");
  writeFileSync(
    target,
    example
      .replaceAll("REPLACE_WITH_64_HEX_CHARACTERS", key)
      .replaceAll("REPLACE_WITH_RANDOM_LOCAL_PASSWORD", password),
  );
  if (folder === "backend") {
    mkdirSync(resolve(root, "tmp"), { recursive: true });
    writeFileSync(
      resolve(root, "tmp", "admin-access.txt"),
      `Yalnızca yerel geliştirme erişimi\nAdres: http://localhost:3000/yonetim\nE-posta: admin@quantia.local\nŞifre: ${password}\n\nBu dosyayı paylaşmayın. Üretimde yeni yönetici ve şifre oluşturun.\n`,
    );
  }
}
console.log("Yerel ortam dosyaları hazır. Yönetici erişimi: tmp/admin-access.txt");
