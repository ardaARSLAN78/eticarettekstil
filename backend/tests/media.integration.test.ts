import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { seedAdmin, seedCatalog } from "../prisma/fixtures.js";
import { clearLocalLimits } from "../src/core/redis/index.js";
import { admin, adminEmail, app, db, testPassword, visitor } from "./helpers.js";

beforeAll(async () => {
  await seedCatalog(db);
  await seedAdmin(db, adminEmail, testPassword);
});

beforeEach(() => clearLocalLimits());
afterAll(async () => db.$disconnect());

it("giriş yapmayan kullanıcı görsel yükleyemez", async () => {
  const response = await visitor()
    .post("/admin/media")
    .set("Origin", "http://localhost:3000")
    .set("x-quantia-request", "1")
    .attach("file", Buffer.from("invalid"), "image.png");

  expect(response.status).toBe(400);
  expect(response.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
});

it("PNG uzantısı verilmiş aktif SVG dosyasını reddeder", async () => {
  const agent = await admin();
  const response = await agent
    .post("/admin/media")
    .set("Origin", "http://localhost:3000")
    .set("x-quantia-request", "1")
    .attach(
      "file",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      "image.png",
    );

  expect(response.status).toBe(400);
  expect(response.body.errors[0].message).toContain("JPEG");
});

it("yöneticinin gerçek görselini WebP olarak kaydeder ve metadata oluşturur", async () => {
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#263f32" } })
    .png()
    .toBuffer();
  const agent = await admin();
  const response = await agent
    .post("/admin/media")
    .set("Origin", "http://localhost:3000")
    .set("x-quantia-request", "1")
    .attach("file", image, "quantia-test.png");

  expect(response.status).toBe(201);
  expect(response.body.url).toMatch(/^\/media\/uploads\/[a-f0-9]{64}\.webp$/);
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: response.body.id } });
  expect(asset.mimeType).toBe("image/webp");
  expect(asset.width).toBe(8);

  const served = await request(app).get(`/uploads/${asset.key}`);
  expect(served.status).toBe(200);
  expect(served.headers["content-type"]).toContain("image/webp");
  expect(served.headers["x-content-type-options"]).toBe("nosniff");
});

it("geniş ekran kampanya görselini 2000 piksele düşürmeden korur", async () => {
  const image = await sharp({
    create: { width: 3200, height: 1800, channels: 3, background: "#d4c3a0" },
  })
    .png()
    .toBuffer();
  const response = await (
    await admin()
  )
    .post("/admin/media")
    .set("Origin", "http://localhost:3000")
    .set("x-quantia-request", "1")
    .attach("file", image, "wide-hero.png");
  expect(response.status).toBe(201);
  expect(response.body.width).toBe(3200);
  expect(response.body.height).toBe(1800);
});
