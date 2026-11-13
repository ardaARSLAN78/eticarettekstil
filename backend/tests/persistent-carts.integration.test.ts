import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedCatalog } from "../prisma/fixtures.js";
import { clearLocalLimits } from "../src/core/redis/index.js";
import {
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

beforeAll(async () => seedCatalog(db));
beforeEach(() => clearLocalLimits());
afterAll(async () => db.$disconnect());
const query = "{cart{id version itemCount items{variantId quantity}}}";
async function login(agent: ReturnType<typeof visitor>, email: string) {
  const response = await gql(agent, "mutation($input:LoginInput!){login(input:$input){id}}", {
    input: { email, password: testPassword },
  });
  expect(response.body.errors).toBeUndefined();
}

describe("Kalıcı hesap sepeti", () => {
  it("ekleme ve silme yenileme, çıkış ve başka cihazdan giriş sonrasında korunur", async () => {
    const { agent, email } = await customer();
    const product = await createProduct();
    await addToCart(agent, product.variants[0]!.id, 2);
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(2);
    await gql(agent, "mutation{logout}");
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(0);
    const otherDevice = visitor();
    await login(otherDevice, email);
    expect((await gql(otherDevice, query)).body.data.cart.itemCount).toBe(2);
    await addToCart(otherDevice, product.variants[0]!.id, 0);
    expect((await gql(otherDevice, query)).body.data.cart.itemCount).toBe(0);
    await gql(otherDevice, "mutation{logout}");
    await login(agent, email);
    expect((await gql(agent, query)).body.data.cart.items).toEqual([]);
  });

  it("hesap sepeti misafir çerezinin 30 günlük süresinden bağımsızdır", async () => {
    const { agent, id } = await customer();
    const product = await createProduct();
    await addToCart(agent, product.variants[0]!.id);
    await db.cart.update({ where: { userId: id }, data: { expiresAt: new Date(0) } });
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(1);
  });

  it("misafir sepetini girişte bir kere birleştirir; tekrar giriş miktarı çoğaltmaz", async () => {
    const { agent, email } = await customer();
    const product = await createProduct();
    await addToCart(agent, product.variants[0]!.id, 2);
    const guest = visitor();
    await addToCart(guest, product.variants[0]!.id, 3);
    await login(guest, email);
    expect((await gql(guest, query)).body.data.cart.itemCount).toBe(5);
    await gql(guest, "mutation{logout}");
    await login(guest, email);
    expect((await gql(guest, query)).body.data.cart.itemCount).toBe(5);
  });

  it("kayıtta misafir ürünleri korunur ve başka müşteri aynı sepete erişemez", async () => {
    const guest = visitor();
    const product = await createProduct();
    const added = await addToCart(guest, product.variants[0]!.id);
    const rawCookie = added.headers["set-cookie"] as unknown as string[];
    const guestCookie = rawCookie.find((value) => value.startsWith("quantia_cart="))!.split(";")[0];
    await gql(guest, "mutation($input:RegisterInput!){register(input:$input){id}}", {
      input: {
        name: "Sepet Sahibi",
        email: `${randomUUID()}@quantia.test`,
        password: testPassword,
      },
    });
    expect((await gql(guest, query)).body.data.cart.itemCount).toBe(1);
    const stranger = visitor().set("Cookie", guestCookie);
    expect((await gql(stranger, query)).body.data.cart.itemCount).toBe(0);
    const other = await customer();
    expect((await gql(other.agent, query)).body.data.cart.itemCount).toBe(0);
  });

  it("iki cihazdan aynı anda eklenen adetleri kaybetmez", async () => {
    const { agent, email } = await customer();
    const second = visitor();
    await login(second, email);
    const product = await createProduct();
    const mutation = "mutation($id:ID!){adjustCartItem(variantId:$id,delta:1){itemCount version}}";
    const responses = await Promise.all([
      gql(agent, mutation, { id: product.variants[0]!.id }),
      gql(second, mutation, { id: product.variants[0]!.id }),
    ]);
    for (const response of responses) expect(response.body.errors).toBeUndefined();
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(2);
  });

  it("eski sekmenin silinen ürünü eski miktarla geri getirmesini engeller", async () => {
    const { agent } = await customer();
    const product = await createProduct();
    await addToCart(agent, product.variants[0]!.id);
    const before = (await gql(agent, query)).body.data.cart;
    await addToCart(agent, product.variants[0]!.id, 0);
    const stale = await gql(
      agent,
      "mutation($id:ID!,$v:Int!){setCartItem(variantId:$id,quantity:2,expectedVersion:$v){itemCount}}",
      { id: product.variants[0]!.id, v: before.version },
    );
    expect(stale.body.errors[0].extensions.code).toBe("CONFLICT");
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(0);
  });

  it("siparişten sonra hesap sepetini boşaltır, tekrar girişte geri getirmez", async () => {
    const { agent, email } = await customer();
    const product = await createProduct();
    await addToCart(agent, product.variants[0]!.id);
    const response = await placeOrder(agent, checkoutInput({ email }));
    expect(response.body.errors).toBeUndefined();
    await gql(agent, "mutation{logout}");
    await login(agent, email);
    expect((await gql(agent, query)).body.data.cart.itemCount).toBe(0);
  });
});
