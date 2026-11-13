import { createHmac, randomBytes } from "node:crypto";
import { config } from "../../../core/config/index.js";
import { fail } from "../../../lib/errors.js";
import type { PaymentAdapter } from "../payments.types.js";
import { providerFetch } from "./http.js";

export async function iyzicoRequest<T>(
  path: string,
  payload: object,
  secrets: Record<string, string>,
  sandbox: boolean,
): Promise<T> {
  const body = JSON.stringify(payload);
  const random = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", secrets.secretKey!)
    .update(random + path + body)
    .digest("hex");
  const authorization = Buffer.from(
    `apiKey:${secrets.apiKey}&randomKey:${random}&signature:${signature}`,
  ).toString("base64");
  return providerFetch<T>(
    `${sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com"}${path}`,
    {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `IYZWSv2 ${authorization}`,
        "x-iyzi-rnd": random,
      },
    },
  );
}

export const iyzicoAdapter: PaymentAdapter = {
  id: "IYZICO",
  label: "iyzico",
  fields: [
    { key: "apiKey", label: "API anahtarı", secret: true },
    { key: "secretKey", label: "Gizli anahtar", secret: true },
  ],
  async start({ order, secrets, sandbox, ip, identityNumber }) {
    if (!identityNumber) fail("iyzico doğrulaması için kimlik numarası gereklidir.");
    const names = order.customerName.split(" ");
    const address = {
      contactName: order.customerName,
      city: order.city,
      country: "Turkey",
      address: `${order.district}, ${order.address}`,
      zipCode: order.postalCode,
    };
    const basketItems = order.items.map((item) => ({
      id: item.sku,
      name: item.name,
      category1: "Erkek Giyim",
      itemType: "PHYSICAL",
      price: ((item.unitPrice * item.quantity - (item.discountAmount ?? 0)) / 100).toFixed(2),
    }));
    if (order.shipping)
      basketItems.push({
        id: "KARGO",
        name: "Kargo",
        category1: "Hizmet",
        itemType: "VIRTUAL",
        price: (order.shipping / 100).toFixed(2),
      });
    const result = await iyzicoRequest<{ status: string; paymentPageUrl?: string; token?: string }>(
      "/payment/iyzipos/checkoutform/initialize/auth/ecom",
      {
        locale: "tr",
        conversationId: order.id,
        price: (order.total / 100).toFixed(2),
        paidPrice: (order.total / 100).toFixed(2),
        currency: "TRY",
        basketId: order.id,
        paymentGroup: "PRODUCT",
        callbackUrl: `${config.PUBLIC_API_URL}/payments/iyzico/callback`,
        enabledInstallments: [1],
        buyer: {
          id: order.id,
          name: names[0],
          surname: names.slice(1).join(" ") || names[0],
          gsmNumber: order.phone,
          email: order.email,
          identityNumber,
          registrationAddress: order.address,
          ip,
          city: order.city,
          country: "Turkey",
          zipCode: order.postalCode,
        },
        shippingAddress: address,
        billingAddress: address,
        basketItems,
      },
      secrets,
      sandbox,
    );
    if (result.status !== "success" || !result.paymentPageUrl || !result.token)
      fail(
        "iyzico ödeme oturumu başlatılamadı. Paneldeki bilgileri kontrol edin.",
        "PAYMENT_PROVIDER_ERROR",
      );
    const host = new URL(result.paymentPageUrl).hostname;
    if (
      !result.paymentPageUrl.startsWith("https://") ||
      !(
        host === "iyzipay.com" ||
        host.endsWith(".iyzipay.com") ||
        host === "iyzico.com" ||
        host.endsWith(".iyzico.com")
      )
    )
      fail("Ödeme adresi doğrulanamadı.");
    return { url: result.paymentPageUrl, token: result.token };
  },
};
