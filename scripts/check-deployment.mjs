import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// Mevcut mağazanın volume'lerine bağlanmadan boş bir üretim kurulumunu sınar.
const root = resolve(import.meta.dirname, "..");
const project = "quantia-deployment-check";
const origin = "https://quantia-deployment.invalid";
const password = `Q!${randomBytes(24).toString("hex")}`;
const envFile = resolve(root, "tmp/deployment-check.env");
const overrideFile = resolve(root, "tmp/deployment-check.yml");
const base = "http://127.0.0.1:3300";
let started = false;
const createdFiles = [];

function subnetRange(value) {
  const [address, prefix] = value.split("/");
  const size = 2 ** (32 - Number(prefix));
  const number = address.split(".").reduce((total, octet) => total * 256 + Number(octet), 0);
  const first = Math.floor(number / size) * size;
  return [first, first + size - 1];
}

function unusedSubnet() {
  const ids = docker(["network", "ls", "-q"], true).split(/\s+/).filter(Boolean);
  const networks = JSON.parse(docker(["network", "inspect", ...ids], true));
  const ranges = networks
    .flatMap((network) => network.IPAM?.Config ?? [])
    .map((item) => item.Subnet)
    .filter((value) => value && !value.includes(":"))
    .map(subnetRange);
  for (let index = 1; index < 255; index++) {
    const subnet = `10.253.${index}.0/28`;
    const [first, last] = subnetRange(subnet);
    if (!ranges.some(([start, end]) => first <= end && last >= start)) return subnet;
  }
  throw new Error("Kontrol için boş Docker alt ağı bulunamadı.");
}

function docker(args, quiet = false) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0) throw new Error("Docker kontrol adımı başarısız.");
  return result.stdout?.trim() ?? "";
}
const compose = (...args) =>
  docker([
    "compose",
    "-p",
    project,
    "--env-file",
    envFile,
    "-f",
    "compose.yml",
    "-f",
    "compose.production.yml",
    "-f",
    overrideFile,
    "--profile",
    "app",
    ...args,
  ]);

let cookie = "";
async function gql(query, variables) {
  const response = await fetch(`${base}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "x-quantia-request": "1",
      Cookie: cookie,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.errors, undefined, "API işlemi başarısız.");
  return { data: body.data, response };
}

try {
  // Bu proje adında daha önceden kaynak varsa otomatik temizlenmez.
  for (const kind of ["container", "volume", "network"]) {
    const existing = docker(
      [kind, "ls", "--filter", `label=com.docker.compose.project=${project}`, "-q"],
      true,
    );
    assert.equal(existing, "", "Kontrol projesinin eski kaynakları var; önce elle inceleyin.");
  }
  await mkdir(resolve(root, "tmp"), { recursive: true });
  await writeFile(
    envFile,
    [
      "POSTGRES_USER=quantia",
      "POSTGRES_DB=quantia",
      `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`,
      `ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
      `WEB_ORIGIN=${origin}`,
      `PUBLIC_API_URL=${origin}`,
      `DEPLOY_CHECK_ADMIN_PASSWORD=${password}`,
      "",
    ].join("\n"),
    { mode: 0o600, flag: "wx" },
  );
  createdFiles.push(envFile);
  await writeFile(
    overrideFile,
    [
      "services:",
      "  backend:",
      "    image: quantia-backend:latest",
      "    environment:",
      "      SEED_ADMIN_EMAIL: deployment-check@quantia.test",
      "      SEED_ADMIN_PASSWORD: ${DEPLOY_CHECK_ADMIN_PASSWORD}",
      "  worker:",
      "    image: quantia-worker:latest",
      "  frontend:",
      "    image: quantia-frontend:latest",
      "  gateway:",
      "    ports: !override",
      '      - "127.0.0.1:3300:80"',
      "networks:",
      "  default:",
      "    ipam:",
      "      config:",
      `        - subnet: ${unusedSubnet()}`,
      "",
    ].join("\n"),
    { flag: "wx" },
  );
  createdFiles.push(overrideFile);
  compose("config", "--quiet");
  started = true;
  compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "120");
  compose("exec", "-T", "backend", "node", "backend/scripts/create-admin.mjs");

  // TLS sonlandırıcının arkasındaki HTTP geçidi sınanır; gerçek sertifika kurulumu sınanmaz.
  const page = await fetch(base, { signal: AbortSignal.timeout(20000) });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /nonce-/);
  const publicData = (await gql("{settings products{total} paymentMethods{provider}}")).data;
  assert.equal(publicData.products.total, 0, "Boş üretim veritabanına örnek katalog eklenmemeli.");
  assert(!publicData.paymentMethods.some((method) => method.provider === "DEMO"));
  const login = await gql("mutation($input:LoginInput!){login(input:$input){role}}", {
    input: { email: "deployment-check@quantia.test", password },
  });
  assert.equal(login.data.login.role, "ADMIN");
  const session = login.response.headers
    .getSetCookie()
    .find((value) => value.startsWith("quantia_session="));
  assert(
    session?.includes("Secure") && session.includes("HttpOnly") && /SameSite=Lax/i.test(session),
  );
  // Gerçekte HTTPS üzerinden taşınacak çerez, yerel HTTP provasına elle iletilir.
  cookie = session.split(";")[0];
  const adminData = (await gql("{adminWarehouses adminUsers}")).data;
  assert(adminData.adminWarehouses.some((warehouse) => warehouse.id === "main"));
  assert.equal(adminData.adminUsers.total, 1);

  const form = new FormData();
  const png = await readFile(resolve(root, "frontend/public/media/polo.png"));
  form.append("file", new Blob([png], { type: "image/png" }), "deployment-check.png");
  const upload = await fetch(`${base}/api/media`, {
    method: "POST",
    headers: { Origin: origin, "x-quantia-request": "1", Cookie: cookie },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(upload.status, 201, "Üretim görsel yüklemesi başarısız.");
  const asset = await upload.json();
  assert.equal((await fetch(`${base}${asset.url}`)).status, 200);
  compose("restart", "backend");
  compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "120");
  assert.equal((await gql("{adminUsers}")).data.adminUsers.total, 1);
  assert.equal((await fetch(`${base}${asset.url}`)).status, 200);
  console.log(
    "BAŞARILI: boş üretim kurulumu, migration, admin, Secure çerez, kapalı demo, medya ve yeniden başlatmada kalıcılık.",
  );
} catch (error) {
  console.error("Kurulum provası başarısız; hedef sunucuya geçmeden önce kontrol edilmeli.");
  console.error(error instanceof Error ? error.message : "Bilinmeyen kontrol hatası.");
  process.exitCode = 1;
} finally {
  // Yalnızca yukarıda yokluğu doğrulanan, bu koşuda oluşturulan kaynaklar kaldırılır.
  if (started) {
    try {
      compose("down", "--volumes");
    } catch {
      console.error("Geçici kontrol kaynakları kapatılamadı; proje adını elle inceleyin.");
      process.exitCode = 1;
    }
  }
  for (const file of createdFiles) await unlink(file).catch(() => undefined);
}
