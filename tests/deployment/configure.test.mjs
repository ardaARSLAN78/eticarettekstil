import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const script = resolve("scripts/deploy/configure.mjs");
function run(directory, domain = "magaza.example.com", networks = []) {
  return spawnSync(process.execPath, [script, "--directory", directory, "--domain", domain], {
    input: JSON.stringify(networks),
    encoding: "utf8",
  });
}
test("kurulum sırları tekrar çalıştırmada korunur; çakışan alt ağ seçilmez", async () => {
  const dir = await mkdtemp(resolve("tmp/configure-test-"));
  try {
    assert.equal(
      run(dir, undefined, [{ IPAM: { Config: [{ Subnet: "10.253.1.0/24" }] } }]).status,
      0,
    );
    const before = await readFile(resolve(dir, "state.json"), "utf8");
    const state = JSON.parse(before);
    assert.equal(state.subnet, "10.253.2.0/28");
    assert.match(state.encryptionKey, /^[a-f0-9]{64}$/);
    assert.equal(run(dir).status, 0);
    assert.equal(await readFile(resolve(dir, "state.json"), "utf8"), before);
    assert.equal(run(dir, "different.example.com").status, 1);
    assert.equal(await readFile(resolve(dir, "state.json"), "utf8"), before);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("alan adı içine komut/port/yol veya değişken eklenemez", async () => {
  const dir = await mkdtemp(resolve("tmp/configure-test-"));
  try {
    for (const value of [
      "x.com;id",
      "x.com/path",
      "x.com:443",
      "$(whoami).com",
      "x.com\nKEY=bad",
      "-x.com",
      "localhost",
    ])
      assert.equal(run(dir, value).status, 1, value);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("bozuk veya kayıp sır dosyasında parolalar otomatik yenilenmez", async () => {
  const dir = await mkdtemp(resolve("tmp/configure-test-"));
  try {
    await writeFile(resolve(dir, "runtime.env"), "existing secret");
    assert.equal(run(dir).status, 1);
    assert.equal(await readFile(resolve(dir, "runtime.env"), "utf8"), "existing secret");
    await writeFile(resolve(dir, "state.json"), "{broken");
    assert.equal(run(dir).status, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
