import { createHmac } from "node:crypto";
import { config } from "../../../core/config/index.js";
import { fail } from "../../../lib/errors.js";
import type { PaymentAdapter } from "../payments.types.js";
import { providerFetch } from "./http.js";

export function paytrHash(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64");
}

export const paytrAdapter: PaymentAdapter = {
  id: "PAYTR",
  label: "PayTR",
  fields: [
    { key: "merchantId", label: "Mağaza numarası", secret: false },
    { key: "merchantKey", label: "Mağaza anahtarı", secret: true },
    { key: "merchantSalt", label: "Mağaza gizli anahtarı", secret: true },
  ],
  async start({ order, secrets, sandbox, ip, receiptToken }) {
    const basket: [string, string, number][] = order.items.map((item) =>
      item.discountAmount
        ? [
            `${item.name} (${item.quantity} adet)`,
            ((item.unitPrice * item.quantity - item.discountAmount) / 100).toFixed(2),
            1,
          ]
        : [item.name, (item.unitPrice / 100).toFixed(2), item.quantity],
    );
    if (order.shipping) basket.push(["Kargo", (order.shipping / 100).toFixed(2), 1]);
    const userBasket = Buffer.from(JSON.stringify(basket)).toString("base64");
    const testMode = sandbox ? "1" : "0";
    const fields = {
      merchant_id: secrets.merchantId!,
      user_ip: ip.replace("::ffff:", ""),
      merchant_oid: order.id,
      email: order.email,
      payment_amount: String(order.total),
      user_basket: userBasket,
      no_installment: "1",
      max_installment: "0",
      currency: "TL",
      test_mode: testMode,
      user_name: order.customerName,
      user_address: order.address,
      user_phone: order.phone,
      merchant_ok_url: `${config.WEB_ORIGIN}/siparis/${receiptToken}`,
      merchant_fail_url: `${config.WEB_ORIGIN}/siparis/${receiptToken}?payment=failed`,
      timeout_limit: "30",
      debug_on: "0",
      lang: "tr",
    };
    const signature = `${fields.merchant_id}${fields.user_ip}${fields.merchant_oid}${fields.email}${fields.payment_amount}${fields.user_basket}${fields.no_installment}${fields.max_installment}${fields.currency}${fields.test_mode}${secrets.merchantSalt}`;
    const result = await providerFetch<{ status: string; token?: string }>(
      "https://www.paytr.com/odeme/api/get-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          ...fields,
          paytr_token: paytrHash(signature, secrets.merchantKey!),
        }),
      },
    );
    if (result.status !== "success" || !result.token)
      fail(
        "PayTR ödeme oturumu başlatılamadı. Paneldeki bilgileri kontrol edin.",
        "PAYMENT_PROVIDER_ERROR",
      );
    if (!/^[A-Za-z0-9_-]+$/.test(result.token)) fail("Ödeme yanıtı doğrulanamadı.");
    return { url: `https://www.paytr.com/odeme/guvenli/${result.token}`, token: result.token };
  },
};
