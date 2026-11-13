import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import https from "node:https";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const folder = resolve(root, "tmp/installer-check");
const project = "quantia-server-install-check";
const domain = "quantia-install.test";
const override = resolve(folder, "override.yml");
let started = false;
let owned = false;
function docker(args, quiet = false) {
  const output = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (output.status !== 0) throw new Error("Docker doğrulama adımı başarısız.");
  return output.stdout?.trim() ?? "";
}
function compose(...args) {
  return docker([
    "compose",
    "-p",
    project,
    "--env-file",
    resolve(folder, "runtime.env"),
    "-f",
    "compose.server.yml",
    "-f",
    override,
    ...args,
  ]);
}
function secureRequest(path, ca, options = {}) {
  return new Promise((resolveResult, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: 3443,
        servername: domain,
        ca,
        path,
        method: options.method ?? "GET",
        headers: { Host: domain, ...options.headers },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolveResult({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    request.on("error", reject);
    request.setTimeout(20000, () => request.destroy(new Error("HTTPS zaman aşımı.")));
    request.end(options.body);
  });
}
try {
  for (const type of ["container", "volume", "network"])
    assert.equal(
      docker([type, "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], true),
      "",
      "Önceki kontrol kaynakları incelenmeli.",
    );
  await mkdir(folder, { mode: 0o700 });
  owned = true;
  const networks = docker(
    ["network", "inspect", ...docker(["network", "ls", "-q"], true).split(/\s+/)],
    true,
  );
  function configure() {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/deploy/configure.mjs",
        "--directory",
        folder,
        "--domain",
        domain,
        "--project",
        project,
      ],
      { cwd: root, input: networks, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
  }
  configure();
  const state = JSON.parse(await readFile(resolve(folder, "state.json"), "utf8"));
  const before = await readFile(resolve(folder, "runtime.env"), "utf8");
  configure();
  assert.equal(await readFile(resolve(folder, "runtime.env"), "utf8"), before);
  // Sadece testte özel CA kullanılır; canlı Caddyfile ACME ile gerçek sertifika ister.
  await writeFile(
    resolve(folder, "Caddyfile"),
    `${domain} {\n tls internal\n reverse_proxy gateway:80\n}\n`,
  );
  await writeFile(
    override,
    [
      "services:",
      "  frontend:",
      "    image: quantia-frontend:latest",
      "  edge:",
      "    ports: !override",
      '      - "127.0.0.1:3443:443"',
      "    volumes: !override",
      `      - ./tmp/installer-check/Caddyfile:/etc/caddy/Caddyfile:ro`,
      "      - caddy_data:/data",
      "      - caddy_config:/config",
      "",
    ].join("\n"),
  );
  started = true;
  compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "180");
  compose("exec", "-T", "backend", "node", "backend/scripts/bootstrap.mjs");
  compose("exec", "-T", "backend", "node", "backend/scripts/bootstrap.mjs");
  const ids = docker(
    [
      "ps",
      "-q",
      "--filter",
      `label=com.docker.compose.project=${project}`,
      "--filter",
      "label=com.docker.compose.service=edge",
    ],
    true,
  );
  docker(["cp", `${ids}:/data/caddy/pki/authorities/local/root.crt`, resolve(folder, "root.crt")]);
  const ca = await readFile(resolve(folder, "root.crt"));
  const page = await secureRequest("/", ca);
  assert.equal(page.status, 200);
  assert.match(page.headers["content-security-policy"], /nonce-/);
  let cookie = "";
  async function gql(query, variables) {
    const response = await secureRequest("/api/graphql", ca, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: `https://${domain}`,
        "x-quantia-request": "1",
        Cookie: cookie,
      },
      body: JSON.stringify({ query, variables }),
    });
    assert.equal(response.status, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.errors, undefined, JSON.stringify(body.errors));
    return { data: body.data, response };
  }
  const logged = await gql("mutation($input:LoginInput!){login(input:$input){role}}", {
    input: { email: `admin@${domain}`, password: state.adminPassword },
  });
  const session = logged.response.headers["set-cookie"].find((value) =>
    value.startsWith("quantia_session="),
  );
  assert.match(session, /Secure/);
  cookie = session.split(";")[0];
  const seeded = (
    await gql(
      "{categories{id name} colors{id} sizes{id} brands{id} collections{id} adminWarehouses adminUsers paymentMethods{provider}}",
    )
  ).data;
  assert.equal(seeded.categories.length, 6);
  assert.equal(seeded.colors.length, 6);
  assert.equal(seeded.sizes.length, 12);
  assert.equal(seeded.brands.length, 1);
  assert.equal(seeded.collections.length, 1);
  assert.equal(seeded.adminUsers.total, 1);
  assert(!seeded.paymentMethods.some((method) => method.provider === "DEMO"));
  await gql("mutation($input:JSON!){updateSettings(input:$input)}", {
    input: { announcement: "Kurulum verisi korunuyor" },
  });
  // İşletmenin sildiği sözlük ve değiştirdiği yönetici adresi kurulumla geri alınmamalı.
  compose(
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "quantia",
    "-d",
    "quantia",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "DELETE FROM \"Color\" WHERE slug = 'siyah'; UPDATE \"User\" SET email = 'owner@quantia-install.test' WHERE role = 'ADMIN';",
  );
  compose("exec", "-T", "backend", "node", "backend/scripts/bootstrap.mjs");
  const preserved = (await gql("{settings colors{id} adminUsers}")).data;
  assert.equal(preserved.settings.announcement, "Kurulum verisi korunuyor");
  assert.equal(preserved.colors.length, 5);
  assert.equal(preserved.adminUsers.total, 1);
  const backup = docker(
    [
      "compose",
      "-p",
      project,
      "--env-file",
      resolve(folder, "runtime.env"),
      "-f",
      "compose.server.yml",
      "-f",
      override,
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "-U",
      "quantia",
      "-d",
      "quantia",
      "--schema-only",
    ],
    true,
  );
  assert.match(backup, /CREATE TABLE public\."User"/);
  const details = JSON.parse(docker(["inspect", ids], true))[0];
  const edgeIp = Object.values(details.NetworkSettings.Networks)[0].IPAddress;
  const verifyArgs = [
    "run",
    "--rm",
    "--network",
    `${project}_default`,
    "--add-host",
    `${domain}:${edgeIp}`,
    "-e",
    "NODE_EXTRA_CA_CERTS=/workspace/tmp/installer-check/root.crt",
    "--mount",
    `type=bind,source=${root},target=/workspace,readonly`,
    "-w",
    "/workspace",
    "node:24-bookworm-slim",
    "node",
    "scripts/deploy/verify.mjs",
    "--domain",
    domain,
  ];
  docker(verifyArgs);
  compose(
    "up",
    "-d",
    "--no-deps",
    "--no-build",
    "--force-recreate",
    "--wait",
    "--wait-timeout",
    "180",
    "backend",
    "frontend",
  );
  compose("up", "-d", "--no-build", "--wait", "--wait-timeout", "180");
  docker(verifyArgs);
  assert.equal(
    (await gql("{settings adminUsers}")).data.settings.announcement,
    "Kurulum verisi korunuyor",
  );
  console.log(
    "BAŞARILI: üretim migration/bootstrap, tekrar kurulum, sır/veri koruması, gerçek doğrulanmış TLS, Secure oturum, sözlükler, pg_dump ve HTTPS kabul kontrolü.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (started) {
    try {
      compose("down", "--volumes");
    } catch {
      console.error("Geçici kaynak temizliği başarısız.");
      process.exitCode = 1;
    }
  }
  if (owned) await rm(folder, { recursive: true, force: true });
}
