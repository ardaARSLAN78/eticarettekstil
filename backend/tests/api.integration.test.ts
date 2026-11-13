import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import request from "supertest";
import { seedAdmin, seedCatalog } from "../prisma/fixtures.js";
import { clearLocalLimits } from "../src/core/redis/index.js";
import {
  decryptSecrets,
  encryptSecrets,
  hashToken,
  hashPassword,
  verifyPassword,
} from "../src/lib/crypto.js";
import { paymentAdapters } from "../src/modules/payments/payments.registry.js";
import { expireUnpaidOrders } from "../src/modules/orders/orders.service.js";
import { allocateDiscount } from "../src/modules/campaigns/pricing.service.js";
import {
  app,
  db,
  gql,
  visitor,
  admin,
  customer,
  createProduct,
  addToCart,
  placeOrder,
  checkoutInput,
  adminEmail,
  testPassword,
} from "./helpers.js";

beforeAll(async () => {
  // Sabit SQL yalnızca environment.ts tarafından doğrulanan test veritabanında yürütülür.
  if (new URL(process.env.DATABASE_URL!).pathname !== "/quantia_test")
    throw new Error("Test veritabanı korunuyor.");
  await db.$executeRaw`TRUNCATE TABLE "User", "Category", "Brand", "Color", "Size", "Collection", "Setting", "Subscriber", "Campaign", "PaymentConfig", "IntegrationConfig", "Redirect", "Cart" RESTART IDENTITY CASCADE`;
  await seedCatalog(db);
  await seedAdmin(db, adminEmail, testPassword);
});
beforeEach(() => clearLocalLimits());
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await db.campaign.updateMany({ where: { automatic: true }, data: { active: false } });
});
afterAll(async () => db.$disconnect());

describe("HTTP ve GraphQL güvenlik katmanı", () => {
  it("sağlık ve hazır olma uçları gerçek PostgreSQL ile çalışır", async () => {
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.headers["x-powered-by"]).toBeUndefined();
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect((await request(app).get("/health/ready")).status).toBe(200);
  });
  it("yabancı kaynak ve özel başlıksız istekleri reddeder", async () => {
    expect(
      (
        await request(app)
          .post("/graphql")
          .set("Origin", "https://attacker.example")
          .set("x-quantia-request", "1")
          .send({ query: "{ health }" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/graphql")
          .set("Origin", "http://localhost:3000")
          .send({ query: "{ health }" })
      ).status,
    ).toBe(403);
    expect((await request(app).get("/graphql?query={health}")).status).toBe(405);
  });
  it("JSON toplu isteklerini ve birden çok işlemi reddeder", async () => {
    expect(
      (
        await request(app)
          .post("/graphql")
          .set("Origin", "http://localhost:3000")
          .set("x-quantia-request", "1")
          .send([{ query: "{ health }" }])
      ).status,
    ).toBe(400);
    expect((await gql(visitor(), "query A { health } query B { health }")).status).toBe(400);
  });
  it("alias ve fragment ile mutasyon hız sınırı aşılmasını engeller", async () => {
    const result = await gql(visitor(), "mutation { a:logout b:logout }");
    expect(result.status).toBe(400);
    const fragment = await gql(
      visitor(),
      "mutation { ...A } fragment A on Mutation { a:logout b:logout }",
    );
    expect(fragment.status).toBe(400);
  });
  it("fragment döngüsü ve alan patlamasını reddeder", async () => {
    expect((await gql(visitor(), "{ ...A } fragment A on Query { ...A }")).status).toBe(400);
    const query = `{ ${Array.from({ length: 230 }, (_, i) => `x${i}:health`).join(" ")} }`;
    expect((await gql(visitor(), query)).status).toBe(400);
  });
  it("veritabanı iç hatalarını istemciye sızdırmaz", async () => {
    const result = await gql(await admin(), 'mutation { archiveProduct(id:"olmayan-kayit") }');
    expect(result.body.errors[0].extensions.code).toBe("INTERNAL_SERVER_ERROR");
    expect(JSON.stringify(result.body)).not.toMatch(/Prisma|passwordHash|postgresql:\/\//);
  });
});

describe("Kimlik, oturum ve sahiplik", () => {
  it("şifreyi salt ile özetler; yanlış şifreyi kabul etmez", async () => {
    const a = await hashPassword(testPassword);
    const b = await hashPassword(testPassword);
    expect(a).not.toBe(b);
    expect(await verifyPassword(testPassword, a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
  });
  it("üyelik müşteri oluşturur ve HttpOnly oturum verir", async () => {
    const agent = visitor();
    const email = `${randomUUID()}@quantia.test`;
    const result = await gql(
      agent,
      "mutation($input:RegisterInput!){register(input:$input){id email role}}",
      { input: { name: "Müşteri", email, password: testPassword } },
    );
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.register.role).toBe("CUSTOMER");
    const cookie = result.headers["set-cookie"]![0] as string;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    const token = cookie.split(";")[0]!.split("=")[1]!;
    expect(await db.session.findUnique({ where: { tokenHash: hashToken(token) } })).not.toBeNull();
    expect(await db.session.findUnique({ where: { tokenHash: token } })).toBeNull();
    expect((await gql(agent, "{me{email}} ")).body.data.me.email).toBe(email);
  });
  it("kayıtta yönetici rolü enjekte edilemez", async () => {
    const result = await gql(
      visitor(),
      "mutation($input:RegisterInput!){register(input:$input){role}}",
      {
        input: {
          name: "Test",
          email: `${randomUUID()}@quantia.test`,
          password: testPassword,
          role: "ADMIN",
        },
      },
    );
    expect(result.body.errors).toBeDefined();
  });
  it("yanlış giriş genel hata döndürür; art arda denemeleri sınırlar", async () => {
    const agent = visitor();
    const query = "mutation($input:LoginInput!){login(input:$input){id}}";
    const input = { email: "missing@quantia.test", password: "wrong" };
    for (let i = 0; i < 8; i++)
      expect((await gql(agent, query, { input })).body.errors[0].message).toBe(
        "E-posta veya şifre hatalı.",
      );
    expect((await gql(agent, query, { input })).body.errors[0].extensions.code).toBe(
      "RATE_LIMITED",
    );
  });
  it("çıkış oturumu veritabanından iptal eder", async () => {
    const user = await customer();
    await gql(user.agent, "mutation{logout}");
    expect((await gql(user.agent, "{me{id}} ")).body.data.me).toBeNull();
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });
  it("müşteri yönetici API'lerine erişemez", async () => {
    const user = await customer();
    for (const query of [
      "{adminDashboard}",
      "{adminProducts{total}}",
      "{adminPaymentProviders{provider}}",
      "{adminOrders{id}}",
      "{adminCampaigns{id}}",
      "{adminAuditLogs}",
    ])
      expect((await gql(user.agent, query)).body.errors[0].extensions.code).toBe("FORBIDDEN");
  });
  it("adres güncelleme ve silmede kayıt sahipliği zorunludur", async () => {
    const a = await customer();
    const b = await customer();
    const input = {
      label: "Ev",
      fullName: "Ali Yılmaz",
      phone: "05321112233",
      address: "Örnek sokak numara 12",
      city: "İstanbul",
      district: "Kadıköy",
      postalCode: "34710",
      isDefault: true,
    };
    const saved = await gql(a.agent, "mutation($input:JSON!){saveAddress(input:$input){id}}", {
      input,
    });
    const id = saved.body.data.saveAddress.id;
    expect(
      (
        await gql(b.agent, "mutation($input:JSON!){saveAddress(input:$input){id}}", {
          input: { ...input, id },
        })
      ).body.errors,
    ).toBeDefined();
    expect(
      (await gql(b.agent, "mutation($id:ID!){deleteAddress(id:$id)}", { id })).body.errors,
    ).toBeDefined();
    expect(await db.customerAddress.findUnique({ where: { id } })).not.toBeNull();
  });
});

describe("Katalog, sınıflandırma ve SEO", () => {
  it("renk/beden ilişkileri ve görsel alt metni katalogdan alınır", async () => {
    const response = await gql(
      visitor(),
      "{products(filter:{limit:6}){total items{name images media{alt} variants{color size colorId sizeId}}} colors{id hex} sizes{id group}}",
    );
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.products.total).toBeGreaterThanOrEqual(6);
    expect(response.body.data.products.items[0].media[0].alt).toBeTruthy();
    expect(response.body.data.products.items[0].variants[0].colorId).toBeTruthy();
  });
  it("sayfalama ve sorgu girdilerini sınırlar; arama SQL olarak çalışmaz", async () => {
    expect(
      (await gql(visitor(), "{products(filter:{limit:999}){total}} ")).body.errors,
    ).toBeDefined();
    const result = await gql(
      visitor(),
      "query($filter:ProductFilter){products(filter:$filter){total}}",
      { filter: { search: "' OR 1=1; DROP TABLE User;--" } },
    );
    expect(result.body.data.products.total).toBe(0);
    expect(await db.user.count()).toBeGreaterThan(0);
  });
  it("kategori ağacında döngüye izin vermez", async () => {
    const agent = await admin();
    const query = "mutation($input:JSON!){saveCategory(input:$input){id}}";
    const base = { image: "/media/polo.png", sortOrder: 0, active: true };
    const parent = await gql(agent, query, {
      input: { ...base, name: "Üst", slug: `ust-${randomUUID()}` },
    });
    const parentId = parent.body.data.saveCategory.id;
    const child = await gql(agent, query, {
      input: { ...base, name: "Alt", slug: `alt-${randomUUID()}`, parentId },
    });
    const result = await gql(agent, query, {
      input: {
        ...base,
        id: parentId,
        name: "Üst",
        slug: `yeni-${randomUUID()}`,
        parentId: child.body.data.saveCategory.id,
      },
    });
    expect(result.body.errors[0].message).toContain("kendi altına");
  });
  it("arşivlenen ürün mağazada ve SEO dökümünde görünmez", async () => {
    const p = await createProduct();
    await gql(await admin(), "mutation($id:ID!){archiveProduct(id:$id)}", { id: p.id });
    expect(
      (await gql(visitor(), "query($slug:String!){product(slug:$slug){id}}", { slug: p.slug })).body
        .data.product,
    ).toBeNull();
    expect(
      (await gql(visitor(), "{seoEntries{path}} ")).body.data.seoEntries.some(
        (e: { path: string }) => e.path === `/urun/${p.slug}`,
      ),
    ).toBe(false);
  });
  it("SEO yönlendirmesinde dış URL ve döngüyü engeller", async () => {
    const agent = await admin();
    const query = "mutation($input:JSON!){saveRedirect(input:$input){id}}";
    expect(
      (
        await gql(agent, query, {
          input: { fromPath: "/eski", toPath: "https://attacker.example" },
        })
      ).body.errors,
    ).toBeDefined();
    await gql(agent, query, { input: { fromPath: "/eski", toPath: "/yeni" } });
    expect(
      (await gql(agent, query, { input: { fromPath: "/yeni", toPath: "/eski" } })).body.errors,
    ).toBeDefined();
  });
  it("veritabanı negatif stok ve bozuk sipariş tutarını reddeder", async () => {
    const p = await createProduct();
    await expect(
      db.variant.update({ where: { id: p.variants[0]!.id }, data: { stock: -1 } }),
    ).rejects.toThrow();
    const agent = visitor();
    await addToCart(agent, p.variants[0]!.id);
    const placed = await placeOrder(agent);
    const orderId = placed.body.data.checkout.order.id;
    await expect(db.order.update({ where: { id: orderId }, data: { total: 1 } })).rejects.toThrow();
  });
});

describe("Kampanya, kupon ve kuruş hesapları", () => {
  it("indirim dağıtımında kuruşlar kaybolmaz", () => {
    expect(allocateDiscount(100, [333, 333, 334]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(allocateDiscount(2, [1, 1, 1])).toEqual([1, 1, 0]);
  });
  it("kuponu sunucuda uygular ve siparişe tutarlı taşır", async () => {
    const p = await createProduct(5, 150000);
    const agent = visitor();
    await addToCart(agent, p.variants[0]!.id, 2);
    const coupon = await gql(
      agent,
      'mutation{applyCoupon(code:"quantia10"){subtotal discountAmount total}} ',
    );
    expect(coupon.body.data.applyCoupon.discountAmount).toBe(30000);
    const result = await placeOrder(agent);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.checkout.order.total).toBe(279990);
    expect(result.body.data.checkout.order.discountAmount).toBe(30000);
    expect(result.body.data.checkout.order.taxAmount).toBe(24545);
  });
  it("geçersiz veya süresi dolmuş kuponu reddeder", async () => {
    const p = await createProduct();
    const agent = visitor();
    await addToCart(agent, p.variants[0]!.id);
    const response = await gql(agent, 'mutation{applyCoupon(code:"EXPIRED"){id}}');
    expect(response.body.errors[0].extensions.code).toBe("INVALID_COUPON");
  });
  it("aynı e-posta için kullanım sınırını checkout sırasında uygular", async () => {
    const email = `${randomUUID()}@quantia.test`;
    for (let i = 0; i < 2; i++) {
      const p = await createProduct();
      const agent = visitor();
      await addToCart(agent, p.variants[0]!.id);
      await gql(agent, 'mutation{applyCoupon(code:"QUANTIA10"){id}}');
      const result = await placeOrder(agent, checkoutInput({ email }));
      if (i === 0) expect(result.body.errors).toBeUndefined();
      else expect(result.body.errors[0].extensions.code).toBe("INVALID_COUPON");
    }
  });
  it("otomatik kampanyalar içinde en avantajlı tek indirimi seçer", async () => {
    const agent = await admin();
    for (const value of [1000, 2000])
      await gql(agent, "mutation($input:JSON!){saveCampaign(input:$input){id}}", {
        input: {
          name: "Otomatik",
          slug: `auto-${randomUUID()}`,
          type: "PERCENTAGE",
          value,
          active: true,
          automatic: true,
          startsAt: "2026-01-01T00:00:00Z",
          endsAt: "2040-01-01T00:00:00Z",
        },
      });
    const p = await createProduct(5, 100000);
    const buyer = visitor();
    const response = await addToCart(buyer, p.variants[0]!.id);
    expect(response.body.data.setCartItem.discountAmount).toBe(20000);
  });
});

describe("Sepet, sipariş, eşzamanlı stok", () => {
  it("ayrı ziyaretçilerin sepetleri birbirine karışmaz", async () => {
    const p = await createProduct();
    const a = visitor();
    const b = visitor();
    await addToCart(a, p.variants[0]!.id, 2);
    expect((await gql(b, "{cart{itemCount}} ")).body.data.cart.itemCount).toBe(0);
    expect((await gql(a, "{cart{itemCount}} ")).body.data.cart.itemCount).toBe(2);
  });
  it("negatif, aşırı ve stoksuz miktarları reddeder", async () => {
    const p = await createProduct(1);
    const agent = visitor();
    expect((await addToCart(agent, p.variants[0]!.id, -1)).body.errors).toBeDefined();
    expect((await addToCart(agent, p.variants[0]!.id, 11)).body.errors).toBeDefined();
    expect((await addToCart(agent, p.variants[0]!.id, 2)).body.errors[0].extensions.code).toBe(
      "OUT_OF_STOCK",
    );
  });
  it("istemci fiyatını kabul etmez; sunucudaki güncel fiyatı hesaplar", async () => {
    const p = await createProduct(3, 100000);
    const agent = visitor();
    await addToCart(agent, p.variants[0]!.id);
    await db.product.update({ where: { id: p.id }, data: { price: 200000 } });
    const response = await placeOrder(agent);
    expect(response.body.data.checkout.order.items[0].unitPrice).toBe(200000);
    expect(response.body.data.checkout.order.total).toBe(209990);
    const injection = await placeOrder(visitor(), checkoutInput({ total: 1 }));
    expect(injection.body.errors).toBeDefined();
  });
  it("aynı idempotency anahtarı sipariş ve stok düşümünü tekrarlamaz", async () => {
    const p = await createProduct(4);
    const agent = visitor();
    await addToCart(agent, p.variants[0]!.id);
    const input = checkoutInput();
    const a = await placeOrder(agent, input);
    const b = await placeOrder(agent, input);
    expect(a.body.data.checkout.order.id).toBe(b.body.data.checkout.order.id);
    expect(a.body.data.checkout.receiptToken).toBe(b.body.data.checkout.receiptToken);
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      3,
    );
    expect(
      await db.stockMovement.count({
        where: { variantId: p.variants[0]!.id, reason: "RESERVATION" },
      }),
    ).toBe(1);
  });
  it("son ürün için paralel siparişlerden yalnızca biri başarılı olur", async () => {
    const p = await createProduct(1);
    const a = visitor();
    const b = visitor();
    await addToCart(a, p.variants[0]!.id);
    await addToCart(b, p.variants[0]!.id);
    const results = await Promise.all([placeOrder(a), placeOrder(b)]);
    expect(results.filter((r) => r.body.data?.checkout).length).toBe(1);
    expect(
      results.filter((r) => r.body.errors?.[0]?.extensions.code === "OUT_OF_STOCK").length,
    ).toBe(1);
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      0,
    );
  });
  it("sipariş iptalinde stok bir kez bırakılır; geçersiz durum atlanamaz", async () => {
    const p = await createProduct(2);
    const buyer = visitor();
    await addToCart(buyer, p.variants[0]!.id);
    const placed = await placeOrder(buyer);
    const id = placed.body.data.checkout.order.id;
    const agent = await admin();
    const query =
      "mutation($id:ID!,$status:String!){updateOrderStatus(id:$id,status:$status){status}}";
    expect((await gql(agent, query, { id, status: "DELIVERED" })).body.errors).toBeDefined();
    expect(
      (await gql(agent, query, { id, status: "CANCELLED" })).body.data.updateOrderStatus.status,
    ).toBe("CANCELLED");
    expect((await gql(agent, query, { id, status: "CANCELLED" })).body.errors).toBeDefined();
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      2,
    );
  });
  it("başka müşteri siparişleri hesap geçmişinde görünmez", async () => {
    const p = await createProduct();
    const a = await customer();
    const b = await customer();
    await addToCart(a.agent, p.variants[0]!.id);
    const placed = await placeOrder(a.agent, checkoutInput({ email: a.email }));
    expect((await gql(b.agent, "{myOrders{id}} ")).body.data.myOrders).toHaveLength(0);
    expect((await gql(a.agent, "{myOrders{id}} ")).body.data.myOrders[0].id).toBe(
      placed.body.data.checkout.order.id,
    );
    expect(
      (
        await gql(visitor(), "query($token:String!){orderReceipt(token:$token){id}}", {
          token: "a".repeat(64),
        })
      ).body.data.orderReceipt,
    ).toBeNull();
  });
});

describe("Ödeme sırları ve doğrulanmış bildirimler", () => {
  const paytrSecrets = {
    merchantId: "123456",
    merchantKey: "test-key-only",
    merchantSalt: "test-salt-only",
  };
  async function configurePaytr() {
    const result = await gql(
      await admin(),
      "mutation($input:JSON!){savePaymentProvider(input:$input)}",
      { input: { provider: "PAYTR", enabled: true, sandbox: true, secrets: paytrSecrets } },
    );
    expect(result.body.errors).toBeUndefined();
    vi.spyOn(paymentAdapters.PAYTR, "start").mockResolvedValue({
      url: "https://www.paytr.com/odeme/guvenli/test-token",
      token: randomUUID(),
    });
  }
  async function paytrOrder() {
    await configurePaytr();
    const p = await createProduct(3);
    const buyer = visitor();
    await addToCart(buyer, p.variants[0]!.id);
    const response = await placeOrder(buyer, checkoutInput({ paymentProvider: "PAYTR" }));
    if (response.body.errors) throw new Error(JSON.stringify(response.body.errors));
    return { p, order: response.body.data.checkout.order };
  }
  function signedPaytr(id: string, amount: number, status = "success") {
    const total_amount = String(amount);
    const hash = createHmac("sha256", paytrSecrets.merchantKey)
      .update(id + paytrSecrets.merchantSalt + status + total_amount)
      .digest("base64");
    return { merchant_oid: id, status, total_amount, hash, test_mode: "1" };
  }
  it("anahtarları şifreli saklar; panel yanıtına geri koymaz", async () => {
    await configurePaytr();
    const stored = await db.paymentConfig.findUniqueOrThrow({ where: { provider: "PAYTR" } });
    expect(stored.encrypted).not.toContain(paytrSecrets.merchantKey);
    expect(decryptSecrets(stored.encrypted)).toEqual(paytrSecrets);
    const response = await gql(
      await admin(),
      "{adminPaymentProviders{provider presentFields fields{key}}}",
    );
    expect(JSON.stringify(response.body)).not.toContain(paytrSecrets.merchantKey);
    expect(JSON.stringify(response.body)).not.toContain(paytrSecrets.merchantSalt);
  });
  it("AES-GCM şifreli ayarın değiştirilmesini algılar", () => {
    const encrypted = encryptSecrets({ secret: "test-value" });
    const parts = encrypted.split(".");
    parts[2] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecrets(parts.join("."))).toThrow();
  });
  it("sahte imzalı ve doğru imzalı fakat yanlış tutarlı bildirimi reddeder", async () => {
    const { order } = await paytrOrder();
    expect(
      (
        await request(app)
          .post("/payments/paytr/webhook")
          .type("form")
          .send({ ...signedPaytr(order.id, order.total), hash: "forged" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/payments/paytr/webhook")
          .type("form")
          .send(signedPaytr(order.id, order.total - 100))
      ).status,
    ).toBe(400);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "PENDING",
    );
  });
  it("PayTR tekrar bildiriminde siparişi bir kez onaylar", async () => {
    const { p, order } = await paytrOrder();
    const payload = signedPaytr(order.id, order.total);
    for (let i = 0; i < 2; i++)
      expect(
        (await request(app).post("/payments/paytr/webhook").type("form").send(payload)).text,
      ).toBe("OK");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "PAID",
    );
    expect(await db.paymentEvent.count({ where: { orderId: order.id } })).toBe(1);
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      2,
    );
  });
  it("süresi dolan rezervasyonu bir kez bırakır; geç gelen ödeme iade gerektirir", async () => {
    const { p, order } = await paytrOrder();
    await db.order.update({
      where: { id: order.id },
      data: { paymentExpiresAt: new Date(Date.now() - 60000) },
    });
    await expireUnpaidOrders(db);
    await expireUnpaidOrders(db);
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      3,
    );
    expect(
      (
        await request(app)
          .post("/payments/paytr/webhook")
          .type("form")
          .send(signedPaytr(order.id, order.total))
      ).text,
    ).toBe("OK");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "REFUND_REQUIRED",
    );
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      3,
    );
  });
  it("yönetici kart ödemesini sağlayıcı bildirimi olmadan onaylayamaz", async () => {
    const { order } = await paytrOrder();
    expect(
      (
        await gql(
          await admin(),
          'mutation($id:ID!){updateOrderStatus(id:$id,status:"CONFIRMED"){id}}',
          { id: order.id },
        )
      ).body.errors,
    ).toBeDefined();
  });
  it("sağlayıcı başlatma hatasında stok ve kampanya rezervasyonlarını geri alır", async () => {
    await configurePaytr();
    const p = await createProduct(3);
    const other = await createProduct(3);
    const buyer = visitor();
    vi.spyOn(paymentAdapters.PAYTR, "start").mockImplementation(async () => {
      // Dış sağlayıcı yanıtı beklenirken aynı sepete eklenen diğer ürün korunmalı.
      await addToCart(buyer, other.variants[0]!.id);
      throw new Error("simulated provider failure");
    });
    await addToCart(buyer, p.variants[0]!.id);
    await gql(buyer, 'mutation{applyCoupon(code:"QUANTIA10"){id}}');
    const input = checkoutInput({ paymentProvider: "PAYTR" });
    const result = await placeOrder(buyer, input);
    expect(result.body.errors).toBeDefined();
    expect(result.body.errors[0].extensions.code).toBe("PAYMENT_FAILED");
    const order = await db.order.findFirstOrThrow({
      where: { idempotencyKey: input.idempotencyKey },
    });
    expect(order.status).toBe("CANCELLED");
    expect(order.stockReleased).toBe(true);
    expect(await db.campaignRedemption.count({ where: { orderId: order.id } })).toBe(0);
    expect((await db.variant.findUniqueOrThrow({ where: { id: p.variants[0]!.id } })).stock).toBe(
      3,
    );
    const cart = (await gql(buyer, "{cart{itemCount couponCode items{variantId quantity}}}")).body
      .data.cart;
    expect(cart.itemCount).toBe(2);
    expect(cart.couponCode).toBe("QUANTIA10");
    expect(cart.items.map((item: { variantId: string }) => item.variantId)).toEqual(
      expect.arrayContaining([p.variants[0]!.id, other.variants[0]!.id]),
    );
  });
  it("Stripe ham gövde imzasını doğrular ve ödeme ortamını kontrol eder", async () => {
    const webhookSecret = "whsec_test_only";
    await gql(await admin(), "mutation($input:JSON!){savePaymentProvider(input:$input)}", {
      input: {
        provider: "STRIPE",
        enabled: true,
        sandbox: true,
        secrets: { secretKey: "sk_test_not_real", webhookSecret },
      },
    });
    vi.spyOn(paymentAdapters.STRIPE, "start").mockResolvedValue({
      url: "https://checkout.stripe.com/test",
      reference: "cs_test_sample",
    });
    const p = await createProduct();
    const buyer = visitor();
    await addToCart(buyer, p.variants[0]!.id);
    const placed = await placeOrder(buyer, checkoutInput({ paymentProvider: "STRIPE" }));
    const order = placed.body.data.checkout.order;
    const body = JSON.stringify({
      id: `evt_${randomUUID()}`,
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_sample",
          metadata: { orderId: order.id },
          payment_status: "paid",
          amount_total: order.total,
          currency: "try",
        },
      },
    });
    const stripe = new Stripe("sk_test_not_real");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: webhookSecret,
    });
    expect(
      (
        await request(app)
          .post("/payments/stripe/webhook")
          .set("Content-Type", "application/json")
          .send(body)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/payments/stripe/webhook")
          .set("Content-Type", "application/json")
          .set("stripe-signature", signature)
          .send(body)
      ).status,
    ).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "PAID",
    );
  });
});

describe("Mağaza ayarları ve gerçek yorum ilkesi", () => {
  it("yönetici içeriği değiştirir ve denetim kaydı oluşur", async () => {
    const response = await gql(
      await admin(),
      "mutation($input:JSON!){updateSettings(input:$input)}",
      { input: { heroTitle: "Test edilmiş başlık" } },
    );
    expect(response.body.data.updateSettings.heroTitle).toBe("Test edilmiş başlık");
    expect((await gql(visitor(), "{settings}")).body.data.settings.heroTitle).toBe(
      "Test edilmiş başlık",
    );
    expect(await db.auditLog.count({ where: { action: "SETTINGS_UPDATED" } })).toBeGreaterThan(0);
  });
  it("Google hesabı bağlanmadan uydurma puan veya yorum dönmez", async () => {
    const response = await gql(
      visitor(),
      "{googleReviews{configured rating count reviews{author}}}",
    );
    expect(response.body.data.googleReviews).toEqual({
      configured: false,
      rating: null,
      count: 0,
      reviews: [],
    });
  });
  it("bültende açık rıza gerekir; tekrar kayıt aynı sonucu verir", async () => {
    const email = `${randomUUID()}@quantia.test`;
    const agent = visitor();
    const query =
      "mutation($email:String!,$consent:Boolean!){subscribeNewsletter(email:$email,consent:$consent)}";
    expect((await gql(agent, query, { email, consent: false })).body.errors).toBeDefined();
    for (let i = 0; i < 2; i++)
      expect(
        (await gql(agent, query, { email, consent: true })).body.data.subscribeNewsletter,
      ).toBe(true);
    expect(await db.subscriber.count({ where: { email } })).toBe(1);
  });
});
