import { Router, raw, urlencoded } from "express";
import Stripe from "stripe";
import { z } from "zod";
import type { Database } from "../../core/prisma/index.js";
import { config } from "../../core/config/index.js";
import { decryptSecrets, hashToken, safeEqual } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { receiptToken } from "../orders/orders.service.js";
import { applyPaymentEvent } from "./payments.events.js";
import { paytrHash } from "./providers/paytr.js";
import { iyzicoRequest } from "./providers/iyzico.js";

const paytrEvent = z.object({
  merchant_oid: z.string().max(100),
  status: z.enum(["success", "failed"]),
  total_amount: z.string().regex(/^\d{1,10}$/),
  hash: z.string().max(200),
  test_mode: z.string().optional(),
});

export function paymentRoutes(db: Database) {
  const router = Router();
  // Sağlayıcı bildirimleri tarayıcı CSRF akışından ayrıdır; her birinde sağlayıcı doğrulaması zorunludur.
  router.post(
    "/paytr/webhook",
    urlencoded({ extended: false, limit: "16kb" }),
    async (req, res) => {
      const input = paytrEvent.parse(req.body);
      const order = await db.order.findUnique({ where: { id: input.merchant_oid } });
      if (!order?.paymentConfigEncrypted || order.paymentProvider !== "PAYTR")
        fail("Ödeme bulunamadı.", "INVALID_PAYMENT");
      const secrets = decryptSecrets(order.paymentConfigEncrypted);
      const signature = paytrHash(
        input.merchant_oid + secrets.merchantSalt + input.status + input.total_amount,
        secrets.merchantKey!,
      );
      if (!safeEqual(signature, input.hash)) fail("Ödeme imzası geçersiz.", "INVALID_PAYMENT");
      if ((input.test_mode === "1") !== order.paymentSandbox)
        fail("Ödeme ortamı eşleşmiyor.", "INVALID_PAYMENT");
      await applyPaymentEvent(db, {
        orderId: order.id,
        provider: "PAYTR",
        eventKey: `PAYTR:${order.id}:${input.status}`,
        success: input.status === "success",
        amount: Number(input.total_amount),
        currency: "TRY",
        sandbox: order.paymentSandbox,
        reference: order.id,
      });
      res.type("text/plain").send("OK");
    },
  );

  router.post(
    "/iyzico/callback",
    urlencoded({ extended: false, limit: "16kb" }),
    async (req, res) => {
      const token = z.string().min(10).max(500).parse(req.body?.token);
      const order = await db.order.findUnique({ where: { paymentTokenHash: hashToken(token) } });
      if (!order?.paymentConfigEncrypted || order.paymentProvider !== "IYZICO")
        fail("Ödeme bulunamadı.", "INVALID_PAYMENT");
      // Tarayıcı dönüşünü başarılı saymak yerine sonucu iyzico'nun imzalı API'sinden tekrar alırız.
      const result = await iyzicoRequest<{
        status: string;
        paymentStatus?: string;
        conversationId?: string;
        basketId?: string;
        paidPrice?: number | string;
        currency?: string;
        paymentId?: string;
        token?: string;
      }>(
        "/payment/iyzipos/checkoutform/auth/ecom/detail",
        { locale: "tr", conversationId: order.id, token },
        decryptSecrets(order.paymentConfigEncrypted),
        order.paymentSandbox,
      );
      if (
        result.status !== "success" ||
        result.conversationId !== order.id ||
        result.basketId !== order.id ||
        (result.token && result.token !== token)
      )
        fail("Ödeme yanıtı eşleşmiyor.", "INVALID_PAYMENT");
      await applyPaymentEvent(db, {
        orderId: order.id,
        provider: "IYZICO",
        eventKey: `IYZICO:${order.id}:${result.paymentId ?? result.paymentStatus}`,
        success: result.paymentStatus === "SUCCESS",
        amount: Math.round(Number(result.paidPrice) * 100),
        currency: result.currency ?? "",
        sandbox: order.paymentSandbox,
        reference: result.paymentId,
      });
      res.redirect(303, `${config.WEB_ORIGIN}/siparis/${receiptToken(order.id)}`);
    },
  );

  router.post(
    "/stripe/webhook",
    raw({ type: "application/json", limit: "128kb" }),
    async (req, res) => {
      const signature = req.get("stripe-signature");
      if (!signature || !Buffer.isBuffer(req.body))
        fail("Ödeme imzası gerekli.", "INVALID_PAYMENT");
      // Ham gövde ön okumada yalnızca siparişi bulmak için kullanılır; imza doğrulanmadan hiçbir işlem yapılmaz.
      const peek = JSON.parse(req.body.toString("utf8")) as {
        data?: { object?: { metadata?: { orderId?: string } } };
      };
      const orderId = peek.data?.object?.metadata?.orderId;
      if (!orderId || orderId.length > 100) {
        res.json({ received: true });
        return;
      }
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (!order?.paymentConfigEncrypted || order.paymentProvider !== "STRIPE")
        fail("Ödeme bulunamadı.", "INVALID_PAYMENT");
      const secrets = decryptSecrets(order.paymentConfigEncrypted);
      const stripe = new Stripe(secrets.secretKey!);
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, signature, secrets.webhookSecret!);
      } catch {
        fail("Ödeme imzası geçersiz.", "INVALID_PAYMENT");
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.metadata?.orderId !== order.id ||
          (order.paymentReference && session.id !== order.paymentReference)
        )
          fail("Ödeme oturumu eşleşmiyor.", "INVALID_PAYMENT");
        if (session.payment_status === "paid")
          await applyPaymentEvent(db, {
            orderId: order.id,
            provider: "STRIPE",
            eventKey: `STRIPE:${event.id}`,
            success: true,
            amount: session.amount_total ?? -1,
            currency: session.currency?.toUpperCase() ?? "",
            sandbox: !event.livemode,
            reference: session.id,
          });
      }
      res.json({ received: true });
    },
  );
  return router;
}
