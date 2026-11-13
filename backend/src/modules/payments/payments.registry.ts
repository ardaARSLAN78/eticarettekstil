import type { PaymentAdapter, ProviderId } from "./payments.types.js";
import { bankTransferAdapter } from "./providers/bank-transfer.js";
import { iyzicoAdapter } from "./providers/iyzico.js";
import { paytrAdapter } from "./providers/paytr.js";
import { stripeAdapter } from "./providers/stripe.js";

// Yeni sanal POS için bu sözleşmeyi uygulayan bir adaptör ve doğrulama rotası eklenir.
export const paymentAdapters: Record<ProviderId, PaymentAdapter> = {
  IYZICO: iyzicoAdapter,
  PAYTR: paytrAdapter,
  STRIPE: stripeAdapter,
  BANK_TRANSFER: bankTransferAdapter,
};
