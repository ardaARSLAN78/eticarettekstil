import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { domainToASCII } from "node:url";

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error(`${name} değeri gerekli.`);
  return args[index + 1];
}
const directory = resolve(option("--directory", ".deployment"));
const project = option("--project", "quantia-server");
if (!/^[a-z][a-z0-9-]{2,45}$/.test(project)) throw new Error("Geçersiz proje adı.");

export function normalizeDomain(input) {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/^https:\/\//, "")
    .replace(/\/$/, "");
  if (/[\/\\:@?#\s]/.test(raw)) throw new Error("Alan adı port, yol veya boşluk içermemeli.");
  const domain = domainToASCII(raw);
  if (
    domain.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  )
    throw new Error("Yalnızca alan adını girin: magaza.ornek.com");
  return domain;
}

function range(cidr) {
  const [ip, prefix] = cidr.split("/");
  const size = 2 ** (32 - Number(prefix));
  const number = ip.split(".").reduce((sum, octet) => sum * 256 + Number(octet), 0);
  const first = Math.floor(number / size) * size;
  return [first, first + size - 1];
}
function chooseSubnet(networks) {
  const ranges = networks
    .flatMap((network) => network.IPAM?.Config ?? [])
    .map((config) => config.Subnet)
    .filter((value) => value && !value.includes(":"))
    .map(range);
  for (let index = 1; index < 255; index++) {
    const subnet = `10.253.${index}.0/28`;
    const [start, end] = range(subnet);
    if (!ranges.some(([first, last]) => start <= last && end >= first)) return subnet;
  }
  throw new Error("Boş Docker alt ağı bulunamadı.");
}
async function atomicFile(name, content) {
  const target = resolve(directory, name);
  await writeFile(`${target}.pending`, content, { mode: 0o600 });
  await chmod(`${target}.pending`, 0o600);
  await rename(`${target}.pending`, target);
}

try {
  let state;
  try {
    state = JSON.parse(await readFile(resolve(directory, "state.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error("Kurulum sırları okunamadı; dosya üzerine yazılmadı.");
  }
  const domain = normalizeDomain(option("--domain", state?.domain ?? ""));
  if (state) {
    if (state.domain !== domain || state.project !== project)
      throw new Error("Mevcut kurulumun alan adı/projesi farklı. Sırlar değiştirilmedi.");
    if (
      !/^[a-f0-9]{64}$/.test(state.databasePassword) ||
      !/^[a-f0-9]{64}$/.test(state.encryptionKey) ||
      !/^Q![a-f0-9]{48}$/.test(state.adminPassword) ||
      !/^10\.253\.\d{1,3}\.0\/28$/.test(state.subnet)
    )
      throw new Error("Mevcut kurulum sırları geçersiz. Otomatik yenilenmedi.");
  } else {
    // Yanlış yerde yeniden kurulumda eski parola/anahtarın kaybolması engellenir.
    for (const name of ["runtime.env", "credentials.txt"]) {
      try {
        await stat(resolve(directory, name));
        throw new Error("Eski ayarlar var ancak state.json yok; önce mevcut kurulum incelenmeli.");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const networks = JSON.parse(input || "[]");
    state = {
      version: 1,
      project,
      domain,
      subnet: chooseSubnet(networks),
      databasePassword: randomBytes(32).toString("hex"),
      encryptionKey: randomBytes(32).toString("hex"),
      adminPassword: `Q!${randomBytes(24).toString("hex")}`,
    };
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await atomicFile("state.json", JSON.stringify(state, null, 2) + "\n");
  }
  await chmod(directory, 0o700);
  await chmod(resolve(directory, "state.json"), 0o600);
  await atomicFile(
    "runtime.env",
    [
      `QUANTIA_PROJECT_NAME=${project}`,
      `QUANTIA_DOMAIN=${domain}`,
      `QUANTIA_SUBNET=${state.subnet}`,
      `POSTGRES_PASSWORD=${state.databasePassword}`,
      `ENCRYPTION_KEY=${state.encryptionKey}`,
      `SEED_ADMIN_EMAIL=admin@${domain}`,
      `SEED_ADMIN_PASSWORD=${state.adminPassword}`,
      "",
    ].join("\n"),
  );
  await atomicFile(
    "credentials.txt",
    `Mağaza: https://${domain}\nYönetim: https://${domain}/yonetim\nE-posta: admin@${domain}\nİlk yönetici şifresi: ${state.adminPassword}\n\nBu dosyayı paylaşmayın. Mevcut hesabın şifresi yeniden kurulumda değiştirilmez.\n`,
  );
  await atomicFile("domain", domain + "\n");
  console.log("Üretim ayarları hazır. Mevcut şifre ve şifreleme anahtarı korundu.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
