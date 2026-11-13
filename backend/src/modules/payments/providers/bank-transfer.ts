import { fail } from "../../../lib/errors.js";
import type { PaymentAdapter } from "../payments.types.js";

export const bankTransferAdapter: PaymentAdapter = {
  id: "BANK_TRANSFER",
  label: "Havale / EFT",
  fields: [],
  async start({ settings }) {
    if (!settings.bankAccountName || !/^TR\d{24}$/.test(settings.bankIban.replaceAll(" ", "")))
      fail("Havale için geçerli hesap adı ve IBAN tanımlanmalıdır.");
    return { url: null };
  },
};
