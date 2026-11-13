import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearLocalLimits } from "../src/core/redis/index.js";
import { seedAdmin, seedCatalog } from "../prisma/fixtures.js";
import {
  admin,
  adminEmail,
  addToCart,
  createProduct,
  db,
  gql,
  placeOrder,
  testPassword,
  visitor,
} from "./helpers.js";

beforeAll(async () => {
  await seedCatalog(db);
  await seedAdmin(db, adminEmail, testPassword);
});

beforeEach(() => clearLocalLimits());
afterAll(async () => db.$disconnect());

function editableProduct(product: Awaited<ReturnType<typeof createProduct>>) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle,
    description: product.description,
    material: product.material,
    care: product.care,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.media.map((image) => ({
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
    })),
    active: true,
    featured: false,
    categoryId: product.categoryId,
    seoTitle: "Özel SEO başlığı | Quantia",
    seoDescription: "Ürünün arama motorlarına yönelik açıklaması.",
    variants: product.variants.map((variant) => ({
      id: variant.id,
      expectedVersion: variant.version,
      colorId: variant.colorId,
      sizeId: variant.sizeId,
      sku: variant.sku,
      stock: variant.stock,
      active: variant.active,
    })),
  };
}

describe("Yönetim ürün API'sinin kapanış senaryoları", () => {
  const saveQuery =
    "mutation($input:JSON!){saveProduct(input:$input){id slug price images variants{id stock version} seoTitle}}";

  it("ürünü renk/beden, görsel alt metni ve SEO alanlarıyla oluşturur", async () => {
    const fixture = await createProduct();
    const input = editableProduct(fixture);
    const { id, ...create } = input;
    create.slug = `yeni-urun-${randomUUID()}`;
    create.variants = create.variants.map(({ id, expectedVersion, ...variant }) => ({
      ...variant,
      sku: `NEW-${randomUUID()}`,
    })) as typeof create.variants;
    const response = await gql(await admin(), saveQuery, { input: create });
    expect(response.body.errors).toBeUndefined();
    const product = await db.product.findUniqueOrThrow({
      where: { id: response.body.data.saveProduct.id },
      include: { media: true, variants: true },
    });
    expect(product.seoTitle).toBe(input.seoTitle);
    expect(product.media[0]!.alt).toBe("Test polo");
    expect(product.variants).toHaveLength(1);
    expect(
      await db.stockMovement.count({
        where: { variantId: product.variants[0]!.id, reason: "INITIAL" },
      }),
    ).toBe(1);
  });

  it("ürün adresi değiştiğinde eski adres için kalıcı yönlendirme kaydeder", async () => {
    const product = await createProduct();
    const input = { ...editableProduct(product), slug: `yenilenen-${randomUUID()}` };
    const response = await gql(await admin(), saveQuery, { input });
    expect(response.body.errors).toBeUndefined();
    expect(
      (await db.redirect.findUniqueOrThrow({ where: { fromPath: `/urun/${product.slug}` } }))
        .toPath,
    ).toBe(`/urun/${input.slug}`);
  });

  it("yönetim ekranında eski kalan stok sürümü sipariş rezervasyonunu ezemez", async () => {
    const product = await createProduct(5);
    const input = { ...editableProduct(product), name: "Bu değişiklik geri alınmalı" };
    const buyer = visitor();
    await addToCart(buyer, product.variants[0]!.id);
    expect((await placeOrder(buyer)).body.errors).toBeUndefined();
    const response = await gql(await admin(), saveQuery, { input });
    expect(response.body.errors[0].extensions.code).toBe("CONFLICT");
    const stored = await db.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: true },
    });
    expect(stored.name).toBe(product.name);
    expect(stored.variants[0]!.stock).toBe(4);
  });

  it("başka ürüne ait varyant kimliğiyle ürün ilişkisi değiştirilemez", async () => {
    const a = await createProduct();
    const b = await createProduct();
    const input = editableProduct(a);
    input.variants[0]!.id = b.variants[0]!.id;
    const response = await gql(await admin(), saveQuery, { input });
    expect(response.body.errors[0].message).toContain("bu ürüne ait değil");
    expect(
      (await db.variant.findUniqueOrThrow({ where: { id: b.variants[0]!.id } })).productId,
    ).toBe(b.id);
  });

  it("aynı renk/beden tekrarı ve güvensiz görsel URL'sini reddeder", async () => {
    const product = await createProduct();
    const input = editableProduct(product);
    const repeated = { ...input, variants: [input.variants[0], input.variants[0]] };
    expect((await gql(await admin(), saveQuery, { input: repeated })).body.errors).toBeDefined();
    expect(
      (
        await gql(await admin(), saveQuery, {
          input: { ...input, images: ["javascript:alert(1)"] },
        })
      ).body.errors,
    ).toBeDefined();
  });

  it("kullanımdaki kategori silinemez", async () => {
    const category = await db.category.findUniqueOrThrow({ where: { slug: "pololar" } });
    const response = await gql(await admin(), "mutation($id:ID!){deleteCategory(id:$id)}", {
      id: category.id,
    });
    expect(response.body.errors[0].message).toContain("kategoride ürün var");
  });

  it("renk ve beden sözlüğü yönetim API'sinden değişir", async () => {
    const agent = await admin();
    const color = await gql(agent, "mutation($input:JSON!){saveColor(input:$input){id name hex}}", {
      input: { name: "Bordo", slug: `bordo-${randomUUID()}`, hex: "#6b2538" },
    });
    expect(color.body.data.saveColor.hex).toBe("#6b2538");
    const size = await gql(agent, "mutation($input:JSON!){saveSize(input:$input){id code group}}", {
      input: {
        label: "Test beden",
        code: randomUUID().slice(0, 8),
        group: "ACCESSORY",
        sortOrder: 1,
      },
    });
    expect(size.body.data.saveSize.group).toBe("ACCESSORY");
  });
});

describe("Kampanya sınır ve kapsam senaryoları", () => {
  it("geçmiş tarihli gerçek kampanyanın kuponunu reddeder", async () => {
    const campaign = await db.campaign.create({
      data: {
        name: "Bitmiş kampanya",
        slug: `expired-${randomUUID()}`,
        type: "PERCENTAGE",
        value: 1000,
        active: true,
        startsAt: new Date("2020-01-01"),
        endsAt: new Date("2021-01-01"),
        coupons: { create: { code: `OLD-${randomUUID().slice(0, 8).toUpperCase()}` } },
      },
      include: { coupons: true },
    });
    const product = await createProduct();
    const buyer = visitor();
    await addToCart(buyer, product.variants[0]!.id);
    const result = await gql(buyer, "mutation($code:String!){applyCoupon(code:$code){id}}", {
      code: campaign.coupons[0]!.code,
    });
    expect(result.body.errors[0].extensions.code).toBe("INVALID_COUPON");
  });

  it("bir kullanımlık kupona gelen paralel siparişlerde sınırı aşmaz", async () => {
    const code = `LAST-${randomUUID().slice(0, 8).toUpperCase()}`;
    const campaign = await db.campaign.create({
      data: {
        name: "Son kupon",
        slug: `limit-${randomUUID()}`,
        type: "PERCENTAGE",
        value: 1000,
        active: true,
        usageLimit: 1,
        startsAt: new Date("2020-01-01"),
        endsAt: new Date("2040-01-01"),
        coupons: { create: { code } },
      },
    });
    const product = await createProduct(5);
    const buyers = [visitor(), visitor()];
    for (const buyer of buyers) {
      await addToCart(buyer, product.variants[0]!.id);
      expect(
        (await gql(buyer, "mutation($code:String!){applyCoupon(code:$code){id}}", { code })).body
          .errors,
      ).toBeUndefined();
    }
    const responses = await Promise.all(buyers.map((buyer) => placeOrder(buyer)));
    expect(responses.filter((response) => response.body.data?.checkout)).toHaveLength(1);
    expect(
      responses.filter(
        (response) => response.body.errors?.[0]?.extensions.code === "INVALID_COUPON",
      ),
    ).toHaveLength(1);
    expect(await db.campaignRedemption.count({ where: { campaignId: campaign.id } })).toBe(1);
  });

  it("kategoriye tanımlı kampanya alt kategorideki ürün için de uygulanır", async () => {
    const parent = await db.category.create({
      data: { name: "Üst grup", slug: `parent-${randomUUID()}`, image: "/media/polo.png" },
    });
    const child = await db.category.create({
      data: {
        name: "Alt grup",
        slug: `child-${randomUUID()}`,
        image: "/media/polo.png",
        parentId: parent.id,
      },
    });
    const product = await createProduct(5, 100000);
    await db.product.update({ where: { id: product.id }, data: { categoryId: child.id } });
    const code = `TREE-${randomUUID().slice(0, 8).toUpperCase()}`;
    await db.campaign.create({
      data: {
        name: "Kategori seçkisi",
        slug: `tree-${randomUUID()}`,
        type: "FIXED_AMOUNT",
        value: 25000,
        active: true,
        startsAt: new Date("2020-01-01"),
        endsAt: new Date("2040-01-01"),
        categories: { connect: { id: parent.id } },
        coupons: { create: { code } },
      },
    });
    const buyer = visitor();
    await addToCart(buyer, product.variants[0]!.id);
    const response = await gql(
      buyer,
      "mutation($code:String!){applyCoupon(code:$code){discountAmount}}",
      { code },
    );
    expect(response.body.data.applyCoupon.discountAmount).toBe(25000);
  });
});
