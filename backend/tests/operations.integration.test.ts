import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedAdmin, seedCatalog } from "../prisma/fixtures.js";
import { clearLocalLimits } from "../src/core/redis/index.js";
import { unsubscribeToken } from "../src/modules/marketing/marketing.service.js";
import {
  admin,
  adminEmail,
  addToCart,
  checkoutInput,
  createProduct,
  customer,
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
const updateStock = "mutation($input:JSON!){updateInventory(input:$input)}";

describe("Yönetim iş kuralları", () => {
  it("müşterinin rapor, müşteri, stok, kullanıcı ve abone bilgilerine erişmesini engeller", async () => {
    const { agent } = await customer();
    for (const query of [
      "{adminReports}",
      "{adminCustomers}",
      "{adminUsers}",
      "{adminInventory}",
      "{adminSubscribers}",
      "{adminWarehouses}",
    ]) {
      const response = await gql(agent, query);
      expect(response.body.errors?.length).toBeGreaterThan(0);
      expect(
        response.body.data == null || Object.values(response.body.data).every((v) => v == null),
      ).toBe(true);
    }
  });

  it("stokta varyanta özgü eşik kullanır; eski sürüm değişikliği reddedilir", async () => {
    const operator = await admin();
    const product = await createProduct(6);
    const variant = await db.variant.update({
      where: { id: product.variants[0]!.id },
      data: { lowStockThreshold: 8 },
    });
    const list = await gql(operator, "query($filter:JSON){adminInventory(filter:$filter)}", {
      filter: { search: variant.sku, lowOnly: true },
    });
    expect(list.body.errors).toBeUndefined();
    expect(list.body.data.adminInventory.items[0].stock).toBe(6);
    const input = {
      variantId: variant.id,
      stock: 4,
      expectedVersion: variant.version,
      warehouseId: "main",
      note: "Sayım düzeltmesi",
    };
    expect((await gql(operator, updateStock, { input })).body.errors).toBeUndefined();
    const stale = await gql(operator, updateStock, { input: { ...input, stock: 9 } });
    expect(stale.body.errors[0].extensions.code).toBe("CONFLICT");
    expect((await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(4);
    const movement = await db.stockMovement.findFirstOrThrow({
      where: { variantId: variant.id, reason: "ADJUSTMENT" },
    });
    expect(movement.delta).toBe(-2);
    expect(movement.warehouseId).toBe("main");
  });

  it("depo transferinin giriş ve çıkış hareketlerini kaydeder, dolu depoyu kapatmaz", async () => {
    const operator = await admin();
    const product = await createProduct(5);
    const variant = product.variants[0]!;
    const warehouse = await db.warehouse.create({
      data: { name: "Test Depo", code: `W${randomUUID().slice(0, 8)}`, address: "Test adresi" },
    });
    const response = await gql(operator, updateStock, {
      input: {
        variantId: variant.id,
        stock: 5,
        expectedVersion: variant.version,
        warehouseId: warehouse.id,
        note: "Depo yerleşimi",
      },
    });
    expect(response.body.errors).toBeUndefined();
    const movements = await db.stockMovement.findMany({ where: { variantId: variant.id } });
    expect(movements.map((m) => [m.warehouseId, m.delta])).toEqual(
      expect.arrayContaining([
        ["main", -5],
        [warehouse.id, 5],
      ]),
    );
    const close = await gql(operator, "mutation($input:JSON!){saveWarehouse(input:$input)}", {
      input: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        address: "",
        active: false,
      },
    });
    expect(close.body.errors?.length).toBe(1);
    expect((await db.warehouse.findUniqueOrThrow({ where: { id: warehouse.id } })).active).toBe(
      true,
    );
  });

  it("açık siparişin deposunu değiştirmez; iptal stokları aynı depoya bir defa iade eder", async () => {
    const operator = await admin();
    const product = await createProduct(5);
    const agent = visitor();
    await addToCart(agent, product.variants[0]!.id);
    const response = await placeOrder(agent);
    const orderId = response.body.data.checkout.order.id;
    const item = await db.orderItem.findFirstOrThrow({ where: { orderId } });
    expect(item.warehouseId).toBe("main");
    const variant = await db.variant.findUniqueOrThrow({ where: { id: item.variantId } });
    const warehouse = await db.warehouse.create({
      data: { name: "Rezerve Test Depo", code: `W${randomUUID().slice(0, 8)}` },
    });
    const move = await gql(operator, updateStock, {
      input: {
        variantId: variant.id,
        stock: variant.stock,
        expectedVersion: variant.version,
        warehouseId: warehouse.id,
        note: "Taşıma denemesi",
      },
    });
    expect(move.body.errors?.length).toBe(1);
    await gql(operator, 'mutation($id:ID!){updateOrderStatus(id:$id,status:"CANCELLED"){id}}', {
      id: orderId,
    });
    expect((await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
    expect(
      await db.stockMovement.count({ where: { orderId, reason: "RELEASE", warehouseId: "main" } }),
    ).toBe(1);
  });

  it("raporda İstanbul gece yarısı sınırını doğru güne yazar ve demo tutarını toplamaz", async () => {
    const operator = await admin();
    const baseline = (await gql(operator, "{adminReports(days:3)}")).body.data.adminReports;
    const today = baseline.timeline.at(-1).day as string;
    const createdAt = new Date(`${today}T00:30:00+03:00`);
    const product = await createProduct();
    const agent = visitor();
    await addToCart(agent, product.variants[0]!.id);
    const order = (await placeOrder(agent)).body.data.checkout.order;
    const demoReport = (await gql(operator, "{adminReports(days:3)}")).body.data.adminReports;
    expect(demoReport.revenue).toBe(baseline.revenue);
    await db.order.update({ where: { id: order.id }, data: { createdAt, paymentStatus: "PAID" } });
    const report = (await gql(operator, "{adminReports(days:3)}")).body.data.adminReports;
    expect(report.revenue - baseline.revenue).toBe(order.total);
    expect(report.timeline.at(-1).revenue - baseline.timeline.at(-1).revenue).toBe(order.total);
    expect(report.topProducts.find((p: { id: string }) => p.id === product.id).quantity).toBe(1);
  });

  it("müşteri aramasında şifre ve oturum verisi dönmez", async () => {
    const operator = await admin();
    const { email, id } = await customer();
    const response = await gql(operator, "query($filter:JSON){adminCustomers(filter:$filter)}", {
      filter: { search: email },
    });
    expect(response.body.data.adminCustomers.items).toHaveLength(1);
    const detail = await gql(operator, "query($id:ID!){adminCustomer(id:$id)}", { id });
    expect(detail.body.data.adminCustomer.email).toBe(email);
    expect(JSON.stringify([response.body, detail.body])).not.toMatch(
      /passwordHash|tokenHash|encrypted/,
    );
  });

  it("erişim değişikliği yönetici şifresi ister ve kapatılan hesabın mevcut oturumunu iptal eder", async () => {
    const operator = await admin();
    const { agent, id, email } = await customer();
    const input = { id, role: "CUSTOMER", disabled: true, currentPassword: "yanlış" };
    const denied = await gql(operator, "mutation($input:JSON!){updateUserAccess(input:$input)}", {
      input,
    });
    expect(denied.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
    const accepted = await gql(operator, "mutation($input:JSON!){updateUserAccess(input:$input)}", {
      input: { ...input, currentPassword: testPassword },
    });
    expect(accepted.body.errors).toBeUndefined();
    expect((await gql(agent, "{me{id}}")).body.data.me).toBeNull();
    const login = await gql(visitor(), "mutation($input:LoginInput!){login(input:$input){id}}", {
      input: { email, password: testPassword },
    });
    expect(login.body.errors?.length).toBe(1);
  });

  it("son aktif yöneticinin kapatılmasını engeller", async () => {
    const operator = await admin();
    const account = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const response = await gql(operator, "mutation($input:JSON!){updateUserAccess(input:$input)}", {
      input: { id: account.id, role: "CUSTOMER", disabled: true, currentPassword: testPassword },
    });
    expect(response.body.errors?.length).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: account.id } })).disabled).toBe(false);
  });

  it("imzalı bülten ayrılmasını doğrular, izin kaydını korur ve tekrar açık onay alır", async () => {
    const agent = visitor();
    const email = `${randomUUID()}@quantia.test`;
    await gql(agent, "mutation($email:String!){subscribeNewsletter(email:$email,consent:true)}", {
      email,
    });
    const subscriber = await db.subscriber.findUniqueOrThrow({ where: { email } });
    const mutation = "mutation($token:String!){unsubscribeNewsletter(token:$token)}";
    expect(
      (await gql(agent, mutation, { token: unsubscribeToken(subscriber.id) + "x" })).body.errors
        ?.length,
    ).toBe(1);
    expect(
      (await gql(agent, mutation, { token: unsubscribeToken(subscriber.id) })).body.errors,
    ).toBeUndefined();
    const removed = await db.subscriber.findUniqueOrThrow({ where: { email } });
    expect(removed.active).toBe(false);
    expect(removed.consentAt).toEqual(subscriber.consentAt);
    await gql(agent, "mutation($email:String!){subscribeNewsletter(email:$email,consent:true)}", {
      email,
    });
    expect((await db.subscriber.findUniqueOrThrow({ where: { email } })).active).toBe(true);
  });
});
