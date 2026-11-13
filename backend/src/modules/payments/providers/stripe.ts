import Stripe from "stripe";
import { config } from "../../../core/config/index.js";
import { fail } from "../../../lib/errors.js";
import type { PaymentAdapter, PaymentStart } from "../payments.types.js";

export function stripeLineItems(order: PaymentStart["order"]) {
  // İndirim kuruşu adetlere tam bölünmeyebilir. Satır net tutarı bir birim olarak gönderilir.
  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
    quantity: 1,
    price_data: {
      currency: "try",
      unit_amount: item.unitPrice * item.quantity - (item.discountAmount ?? 0),
      product_data: {
        name: `${item.name} (${item.quantity} adet) · ${item.color} / ${item.size}`,
      },
    },
  }));

  if (order.shipping) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: "try",
        unit_amount: order.shipping,
        product_data: { name: "Kargo" },
      },
    });
  }

  return lines;
}

export const stripeAdapter: PaymentAdapter = {
  id: "STRIPE",
  label: "Stripe",
  fields: [
    { key: "secretKey", label: "Secret API key", secret: true },
    { key: "webhookSecret", label: "Webhook signing secret", secret: true },
  ],
  async start({ order, secrets, receiptToken }) {
    const stripe = new Stripe(secrets.secretKey!, { timeout: 15000, maxNetworkRetries: 1 });
    const line_items = stripeLineItems(order);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: order.email,
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        payment_method_types: ["card"],
        line_items,
        success_url: `${config.WEB_ORIGIN}/siparis/${receiptToken}`,
        cancel_url: `${config.WEB_ORIGIN}/siparis/${receiptToken}?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      },
      { idempotencyKey: `quantia:${order.id}` },
    );
    if (!session.url?.startsWith("https://checkout.stripe.com/"))
      fail("Stripe ödeme oturumu oluşturulamadı.", "PAYMENT_PROVIDER_ERROR");
    return { url: session.url, reference: session.id };
  },
};
