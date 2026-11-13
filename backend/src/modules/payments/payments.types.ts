import type { Order, OrderItem } from "../../generated/prisma/client.js";
import type { StoreSettings } from "../settings/settings.dto.js";

export type ProviderId = "IYZICO" | "PAYTR" | "STRIPE" | "BANK_TRANSFER";
export interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
}
export interface PaymentStart {
  order: Order & { items: OrderItem[] };
  settings: StoreSettings;
  secrets: Record<string, string>;
  sandbox: boolean;
  ip: string;
  receiptToken: string;
  identityNumber?: string;
}
export interface PaymentRedirect {
  url: string | null;
  token?: string;
  reference?: string;
}
export interface PaymentAdapter {
  id: ProviderId;
  label: string;
  fields: CredentialField[];
  start(input: PaymentStart): Promise<PaymentRedirect>;
}
