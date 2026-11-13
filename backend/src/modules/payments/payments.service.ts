import { config, production } from "../../core/config/index.js";
import type { Database } from "../../core/prisma/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { decryptSecrets, encryptSecrets } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { paymentConfigDto } from "./payments.dto.js";
import { paymentAdapters } from "./payments.registry.js";
import type { ProviderId } from "./payments.types.js";

export async function getPaymentConfiguration(db: Database, provider: string) {
  if (provider === "DEMO") {
    if (!config.ENABLE_DEMO_PAYMENT || production)
      fail("Demo ödeme bu ortamda kapalı.", "PAYMENT_UNAVAILABLE");
    return { sandbox: true, encrypted: null, secrets: {} as Record<string, string> };
  }
  if (!(provider in paymentAdapters)) fail("Ödeme sağlayıcısı desteklenmiyor.");
  const row = await db.paymentConfig.findUnique({ where: { provider } });
  if (!row?.enabled) fail("Bu ödeme yöntemi şu anda kullanılamıyor.", "PAYMENT_UNAVAILABLE");
  return { sandbox: row.sandbox, encrypted: row.encrypted, secrets: decryptSecrets(row.encrypted) };
}

export async function paymentMethods(db: Database) {
  const rows = await db.paymentConfig.findMany({ where: { enabled: true } });
  const methods = rows
    .filter((row) => row.provider in paymentAdapters)
    .map((row) => ({
      provider: row.provider,
      label: paymentAdapters[row.provider as ProviderId].label,
      sandbox: row.sandbox,
    }));
  if (config.ENABLE_DEMO_PAYMENT && !production)
    methods.push({ provider: "DEMO", label: "Demo ödeme · tahsilat yapılmaz", sandbox: true });
  return methods;
}

export async function adminPaymentProviders(context: Context) {
  requireAdmin(context);
  const rows = await context.db.paymentConfig.findMany();
  return Object.values(paymentAdapters).map((adapter) => {
    const row = rows.find((r) => r.provider === adapter.id);
    const secrets = row ? decryptSecrets(row.encrypted) : {};
    return {
      provider: adapter.id,
      label: adapter.label,
      enabled: row?.enabled ?? false,
      sandbox: row?.sandbox ?? true,
      configured: Boolean(row),
      fields: adapter.fields,
      presentFields: Object.keys(secrets).filter((key) => Boolean(secrets[key])),
      callbackUrl: `${config.PUBLIC_API_URL}/payments/${adapter.id.toLowerCase()}/${adapter.id === "IYZICO" ? "callback" : "webhook"}`,
    };
  });
}

export async function savePaymentProvider(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const input = paymentConfigDto.parse(raw);
  const adapter = paymentAdapters[input.provider];
  const previous = await context.db.paymentConfig.findUnique({
    where: { provider: input.provider },
  });
  const secrets = previous ? decryptSecrets(previous.encrypted) : {};
  for (const [key, value] of Object.entries(input.secrets)) {
    if (!adapter.fields.some((field) => field.key === key)) fail("Bilinmeyen ödeme ayarı.");
    if (value.trim()) secrets[key] = value.trim();
  }
  if (input.enabled && adapter.fields.some((field) => !secrets[field.key]))
    fail("Sağlayıcıyı açmadan önce tüm API alanlarını doldurun.");
  if (input.enabled && input.provider === "STRIPE") {
    if (
      !secrets.secretKey?.startsWith(input.sandbox ? "sk_test_" : "sk_live_") ||
      !secrets.webhookSecret?.startsWith("whsec_")
    )
      fail("Stripe anahtar biçimi seçilen test/canlı ortamıyla uyuşmuyor.");
  }
  if (input.enabled && input.provider === "BANK_TRANSFER") {
    const { getSettings } = await import("../settings/settings.service.js");
    const settings = await getSettings(context.db);
    if (!settings.bankAccountName || !/^TR\d{24}$/.test(settings.bankIban.replaceAll(" ", "")))
      fail("Önce mağaza ayarlarına hesap adı ve geçerli IBAN ekleyin.");
  }
  const data = {
    enabled: input.enabled,
    sandbox: input.provider === "BANK_TRANSFER" ? false : input.sandbox,
    encrypted: encryptSecrets(secrets),
  };
  await context.db.$transaction([
    context.db.paymentConfig.upsert({
      where: { provider: input.provider },
      create: { provider: input.provider, ...data },
      update: data,
    }),
    context.db.auditLog.create({
      data: { actorId: admin.id, action: "PAYMENT_PROVIDER_UPDATED", entityId: input.provider },
    }),
  ]);
  return true;
}
