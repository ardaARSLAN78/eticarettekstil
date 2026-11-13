import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/core/prisma/index.js";

export { prisma as db };
export const app = createApp(prisma);
export type Agent = ReturnType<typeof request.agent>;
export const visitor = () => request.agent(app);
export const testPassword = "Quantia-Tests-Only!2026";
export const adminEmail = "backend-admin@quantia.test";

export function gql(agent: Agent, query: string, variables?: Record<string, unknown>) {
  return agent
    .post("/graphql")
    .set("Origin", "http://localhost:3000")
    .set("x-quantia-request", "1")
    .send({ query, variables });
}
export async function admin() {
  const agent = visitor();
  const result = await gql(
    agent,
    "mutation($input: LoginInput!) { login(input: $input) { id role } }",
    { input: { email: adminEmail, password: testPassword } },
  );
  if (result.body.errors) throw new Error(JSON.stringify(result.body.errors));
  return agent;
}

export async function customer() {
  const agent = visitor();
  const email = `${randomUUID()}@quantia.test`;
  const response = await gql(
    agent,
    "mutation($input: RegisterInput!) { register(input: $input) { id role } }",
    { input: { name: "Test Kullanıcısı", email, password: testPassword } },
  );
  return { agent, email, id: response.body.data.register.id as string };
}

export async function createProduct(stock = 12, price = 150000) {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: "pololar" } });
  const color = await prisma.color.findUniqueOrThrow({ where: { slug: "ekru" } });
  const size = await prisma.size.findUniqueOrThrow({
    where: { group_code: { group: "CLOTHING", code: "M" } },
  });
  return prisma.product.create({
    data: {
      name: "Test Keten Polo",
      slug: `test-${randomUUID()}`,
      subtitle: "Entegrasyon testi ürünü",
      description: "Entegrasyon senaryosu için bağımsız ürün.",
      material: "%100 pamuk",
      care: "Hassas yıkama",
      categoryId: category.id,
      price,
      vatRateBps: 1000,
      media: { create: { url: "/media/polo.png", alt: "Test polo" } },
      variants: {
        create: { sku: `TEST-${randomUUID()}`, colorId: color.id, sizeId: size.id, stock },
      },
    },
    include: { variants: true, media: true, category: true },
  });
}

export async function addToCart(agent: Agent, variantId: string, quantity = 1) {
  return gql(
    agent,
    "mutation($id: ID!, $qty: Int!) { setCartItem(variantId: $id, quantity: $qty) { id itemCount subtotal discountAmount total items { variantId quantity } } }",
    { id: variantId, qty: quantity },
  );
}

export function checkoutInput(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    email: `${randomUUID()}@quantia.test`,
    customerName: "Ali Yılmaz",
    phone: "05321112233",
    address: "Örnek Mahallesi Test Sokak No 12",
    city: "İstanbul",
    district: "Kadıköy",
    postalCode: "34710",
    paymentProvider: "DEMO",
    termsAccepted: true,
    ...overrides,
  };
}
export const checkoutQuery =
  "mutation($input: CheckoutInput!) { checkout(input: $input) { receiptToken paymentUrl order { id number total subtotal discountAmount taxAmount shipping status paymentStatus paymentProvider paymentSandbox items { unitPrice quantity } } } }";

export async function placeOrder(agent: Agent, input = checkoutInput()) {
  return gql(agent, checkoutQuery, { input });
}
