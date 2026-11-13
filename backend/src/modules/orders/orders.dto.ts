import { z } from "zod";
import { email, text } from "../../core/sanitizer/index.js";

export const checkoutDto = z
  .object({
    idempotencyKey: z.uuid(),
    email,
    customerName: text(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{10,20}$/, "Geçerli bir telefon numarası girin."),
    address: text(500).min(10),
    city: text(80),
    district: text(80),
    postalCode: z.string().regex(/^\d{5}$/),
    paymentProvider: z.enum(["DEMO", "BANK_TRANSFER", "IYZICO", "PAYTR", "STRIPE"]),
    termsAccepted: z.literal(true, "Satış koşullarını kabul etmelisiniz."),
    identityNumber: z
      .string()
      .regex(/^[1-9]\d{10}$/)
      .optional(),
    billingDetails: z
      .object({
        type: z.enum(["INDIVIDUAL", "COMPANY"]),
        name: text(160),
        address: text(500),
        taxOffice: z.string().max(100).optional(),
        taxNumber: z
          .string()
          .regex(/^\d{10,11}$/)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.paymentProvider === "IYZICO" && !input.identityNumber)
      ctx.addIssue({
        code: "custom",
        path: ["identityNumber"],
        message: "iyzico doğrulaması için kimlik numarası gereklidir.",
      });
    if (
      input.billingDetails?.type === "COMPANY" &&
      (!input.billingDetails.taxNumber || !input.billingDetails.taxOffice)
    )
      ctx.addIssue({
        code: "custom",
        path: ["billingDetails"],
        message: "Kurumsal fatura için vergi dairesi ve numarası gereklidir.",
      });
  });

export const orderStatusDto = z.enum([
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);
