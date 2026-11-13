import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";

async function gql(client: APIRequestContext, query: string, variables?: Record<string, unknown>) {
  const response = await client.post("/api/graphql", { data: { query, variables } });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data;
}
async function loginAdmin(client: APIRequestContext) {
  await gql(client, "mutation($input:LoginInput!){login(input:$input){id role}}", {
    input: { email: "backend-admin@quantia.test", password: "Quantia-Tests-Only!2026" },
  });
}
async function newProduct(client: APIRequestContext) {
  await loginAdmin(client);
  const definitions = await gql(client, "{categories{id} colors{id} sizes{id}}");
  const id = randomUUID().slice(0, 8);
  const input = {
    name: `Kabul Testi Polo ${id}`,
    slug: `e2e-polo-${id}`,
    subtitle: "Kabul testi",
    description: "Kabul testi için ayrı ürün kaydı.",
    material: "Pamuk",
    care: "Hassas yıkama",
    price: 150000,
    categoryId: definitions.categories[0].id,
    active: true,
    featured: false,
    images: [{ url: "/media/polo.png", alt: "Kabul testi polo", sortOrder: 0 }],
    variants: [
      {
        colorId: definitions.colors[0].id,
        sizeId: definitions.sizes[0].id,
        sku: `E2E-${id}`,
        stock: 20,
        active: true,
      },
    ],
  };
  const result = await gql(
    client,
    "mutation($input:JSON!){saveProduct(input:$input){id slug name variants{id}}}",
    { input },
  );
  await gql(client, "mutation{logout}");
  return result.saveProduct;
}

test("ana sayfa üretim HTML, nonce CSP ve yüksek kaliteli kampanya görseli içerir", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain("'nonce-");
  expect(response.headers()["content-security-policy"]).not.toContain("unsafe-eval");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  const html = await response.text();
  expect(html).toContain('lang="tr"');
  expect(html).toContain('class="hero-content"');
  expect(html).toContain("q=100");
  const image = await request.get("/_next/image?url=%2Fmedia%2Fquantia-hero.png&w=2560&q=100");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/");
});

test("mağaza ve yönetim iç sayfaları üretim derlemesinde açılır", async ({ request }) => {
  for (const path of [
    "/koleksiyon",
    "/urun/riviera-orgu-polo",
    "/hesabim",
    "/odeme",
    "/iletisim",
    "/hikayemiz",
    "/bilgilendirme/gizlilik",
    "/bilgilendirme/iade",
    "/bilgilendirme/satis",
    "/yonetim",
    "/bulten/ayril",
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  expect((await request.get("/olmayan-sayfa")).status()).toBe(404);
});

test("SEO çıktıları ve sipariş gizlilik başlıkları doğru döner", async ({ request }) => {
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
  const html = await (await request.get("/urun/riviera-orgu-polo")).text();
  expect(html).toContain('rel="canonical"');
  expect(html).toContain("AggregateOffer");
  const response = await request.get("/siparis/gecersiz-token");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
});

test("BFF yabancı origin ve özel başlıksız mutasyonları reddeder", async ({ request }) => {
  const hostile = await request.post("/api/graphql", {
    headers: { Origin: "https://foreign.example" },
    data: { query: "mutation{logout}" },
  });
  expect(hostile.status()).toBe(403);
  const missing = await request.post("/api/graphql", {
    headers: { "x-quantia-request": "0" },
    data: { query: "mutation{logout}" },
  });
  expect(missing.status()).toBe(403);
  const unauthorized = await request.post("/api/graphql", { data: { query: "{adminReports}" } });
  expect((await unauthorized.json()).errors[0].extensions.code).toBe("UNAUTHENTICATED");
});

test("hesap sepeti yeni istemcide geri gelir; silme, misafir birleşimi ve çıkış kalıcıdır", async ({
  request,
  playwright,
}) => {
  const product = await newProduct(request);
  const email = `e2e-${randomUUID()}@quantia.test`;
  const input = { name: "Kabul Testi Müşteri", email, password: "Quantia-Tests-Only!2026" };
  await gql(request, "mutation($input:RegisterInput!){register(input:$input){id}}", { input });
  await gql(request, "mutation($id:ID!){adjustCartItem(variantId:$id,delta:2){itemCount}}", {
    id: product.variants[0].id,
  });
  const fresh = await playwright.request.newContext({
    baseURL: "http://localhost:3200",
    extraHTTPHeaders: { Origin: "http://localhost:3200", "x-quantia-request": "1" },
  });
  try {
    await gql(fresh, "mutation($input:LoginInput!){login(input:$input){id}}", {
      input: { email, password: input.password },
    });
    expect((await gql(fresh, "{cart{itemCount}}")).cart.itemCount).toBe(2);
    await gql(fresh, "mutation($id:ID!){setCartItem(variantId:$id,quantity:0){itemCount}}", {
      id: product.variants[0].id,
    });
    expect((await gql(request, "{cart{itemCount}}")).cart.itemCount).toBe(0);
    await gql(request, "mutation{logout}");
    await gql(request, "mutation($id:ID!){adjustCartItem(variantId:$id,delta:1){itemCount}}", {
      id: product.variants[0].id,
    });
    await gql(request, "mutation($input:LoginInput!){login(input:$input){id}}", {
      input: { email, password: input.password },
    });
    expect((await gql(request, "{cart{itemCount}}")).cart.itemCount).toBe(1);
  } finally {
    await fresh.dispose();
  }
});

test("demo siparişi tekrarlanan istekte çoğalmaz ve sepet boş kalır", async ({ request }) => {
  const product = await newProduct(request);
  await gql(request, "mutation($id:ID!){adjustCartItem(variantId:$id,delta:1){itemCount}}", {
    id: product.variants[0].id,
  });
  const input = {
    idempotencyKey: randomUUID(),
    email: `e2e-${randomUUID()}@quantia.test`,
    customerName: "Kabul Testi",
    phone: "05321112233",
    address: "Örnek Mahallesi Test Sokak No 12",
    city: "İstanbul",
    district: "Kadıköy",
    postalCode: "34710",
    paymentProvider: "DEMO",
    termsAccepted: true,
  };
  const query =
    "mutation($input:CheckoutInput!){checkout(input:$input){receiptToken order{id paymentStatus}}}";
  const first = (await gql(request, query, { input })).checkout;
  const second = (await gql(request, query, { input })).checkout;
  expect(second.order.id).toBe(first.order.id);
  expect(first.order.paymentStatus).toBe("DEMO");
  expect((await gql(request, "{cart{itemCount}}")).cart.itemCount).toBe(0);
  expect((await request.get(`/siparis/${first.receiptToken}`)).status()).toBe(200);
});

test("admin ayar değişikliği mağaza HTML'ine yansır ve geri alınır", async ({ request }) => {
  await loginAdmin(request);
  const original = (await gql(request, "{settings}")).settings.announcement;
  const announcement = `Quantia kabul testi ${randomUUID()}`;
  try {
    await gql(request, "mutation($input:JSON!){updateSettings(input:$input)}", {
      input: { announcement },
    });
    expect(await (await request.get("/")).text()).toContain(announcement);
  } finally {
    await gql(request, "mutation($input:JSON!){updateSettings(input:$input)}", {
      input: { announcement: original },
    });
  }
});

test("admin alt ekranları gerçek API sözleşmeleriyle veri alır", async ({ request }) => {
  await loginAdmin(request);
  const data = await gql(
    request,
    "{adminUsers adminCustomers adminInventory adminWarehouses adminSubscribers adminReports adminGoogleIntegration adminPaymentProviders{provider configured}}",
  );
  expect(data.adminUsers.items.length).toBeGreaterThan(0);
  expect(data.adminInventory.items.length).toBeGreaterThan(0);
  expect(data.adminWarehouses.length).toBeGreaterThan(0);
  expect(data.adminReports.timeline).toHaveLength(30);
  expect(data.adminPaymentProviders.map((item: { provider: string }) => item.provider)).toEqual(
    expect.arrayContaining(["IYZICO", "PAYTR", "STRIPE", "BANK_TRANSFER"]),
  );
  expect(JSON.stringify(data)).not.toMatch(/passwordHash|tokenHash|encrypted/);
});

test("medya BFF görseli yükler ve aynı ortamdan güvenli URL ile sunar", async ({ request }) => {
  await loginAdmin(request);
  const png = readFileSync(resolve("frontend/public/media/polo.png"));
  const uploaded = await request.post("/api/media", {
    multipart: { file: { name: "e2e.png", mimeType: "image/png", buffer: png } },
  });
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  const asset = await uploaded.json();
  const image = await request.get(asset.url);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/webp");
  expect(image.headers()["x-content-type-options"]).toBe("nosniff");
});
