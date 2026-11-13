"use client";
import { useState, type FormEvent } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { PaymentProviderConfig } from "@/lib/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { useAdminNotice } from "./admin-context";
import { useAdminQuery } from "./use-admin-query";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

function ProviderForm({
  provider,
  reload,
}: {
  provider: PaymentProviderConfig;
  reload: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(provider.enabled);
  const [sandbox, setSandbox] = useState(provider.sandbox);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = useAdminNotice();
  const bank = provider.provider === "BANK_TRANSFER";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const secrets = Object.fromEntries(
      provider.fields.map((field) => [field.key, String(form.get(field.key) ?? "")]),
    );
    try {
      await api("mutation($input:JSON!){savePaymentProvider(input:$input)}", {
        input: { provider: provider.provider, enabled, sandbox: bank ? false : sandbox, secrets },
      });
      notice(
        `${provider.label} ayarları kaydedildi. Sağlayıcı hesabınızdaki kabul testlerini tamamlayın.`,
      );
      await reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel payment-provider-panel">
      <div className="admin-panel-heading">
        <div className="provider-title">
          <CreditCard size={23} strokeWidth={1.2} />
          <div>
            <h2>{provider.label}</h2>
            <span className={`status-pill ${provider.enabled ? "" : "muted-pill"}`}>
              {provider.enabled ? "Etkin" : "Kapalı"}
            </span>
          </div>
        </div>
        <ShieldCheck size={22} strokeWidth={1.2} />
      </div>
      <form onSubmit={save}>
        <div className="form-grid">
          {provider.fields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              name={field.key}
              type={field.secret ? "password" : "text"}
              autoComplete="new-password"
              placeholder={
                provider.presentFields.includes(field.key)
                  ? "Kayıtlı · değiştirmek için yenisini girin"
                  : field.label
              }
              required={enabled && !provider.presentFields.includes(field.key)}
            />
          ))}
        </div>
        {bank ? (
          <p className="admin-description">
            Hesap adı ve IBAN bilgilerini “İçerik & mağaza → Kargo & havale” alanında girin. Ödeme
            banka hesabından kontrol edilerek sipariş ekranında onaylanır.
          </p>
        ) : (
          <>
            <div className="provider-callback">
              <span>Sağlayıcı bildirim adresi</span>
              <code>{provider.callbackUrl}</code>
              <small>
                Bu HTTPS adresini sağlayıcı paneline tanımlayın. Localhost yalnızca yerel geliştirme
                içindir.
              </small>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={sandbox}
                onChange={(event) => setSandbox(event.target.checked)}
              />{" "}
              Test / sandbox ortamı
            </label>
          </>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />{" "}
          Müşteriler bu ödeme yöntemini seçebilsin
        </label>
        {error && <Notice>{error}</Notice>}
        <button className="button" disabled={busy}>
          {busy ? "Kaydediliyor…" : `${provider.label} ayarlarını kaydet`}
        </button>
      </form>
    </section>
  );
}

export function PaymentsAdmin() {
  const { data, error, reload } = useAdminQuery<{ adminPaymentProviders: PaymentProviderConfig[] }>(
    "{adminPaymentProviders{provider label enabled sandbox configured presentFields callbackUrl fields{key label secret}}}",
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ÖDEME ALTYAPILARI</span>
          <h1>Size uygun ödeme.</h1>
          <p>Kendi işletme hesabınızın anahtarlarını girin ve kullanacağınız yöntemleri açın.</p>
        </div>
      </div>
      <div className="admin-info-box">
        <ShieldCheck size={20} />
        <p>
          Kart bilgileri mağazada tutulmaz. API anahtarları şifreli saklanır; kaydedilmiş gizli
          değerler bu ekrana geri gönderilmez.
        </p>
      </div>
      {error && <Notice>{error}</Notice>}
      {data?.adminPaymentProviders.map((provider) => (
        <ProviderForm
          key={`${provider.provider}-${provider.enabled}-${provider.sandbox}`}
          provider={provider}
          reload={reload}
        />
      ))}
    </>
  );
}
