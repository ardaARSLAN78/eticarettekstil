"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { StoreSettings } from "@/lib/types";
import { errorMessage } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { EntityForm, type AdminField } from "./entity-form";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

const groups: { id: string; label: string; fields: AdminField[] }[] = [
  {
    id: "brand",
    label: "Marka & tasarım",
    fields: [
      { key: "brandName", label: "Marka adı" },
      { key: "tagline", label: "Marka cümlesi" },
      { key: "themeColor", label: "Ana renk", hint: "Örnek: #223d32" },
      { key: "logoUrl", label: "Logo", kind: "image" },
      { key: "monogramUrl", label: "Monogram / favicon", kind: "image" },
    ],
  },
  {
    id: "hero",
    label: "Ana sayfa",
    fields: [
      { key: "announcement", label: "Üst duyuru", full: true },
      { key: "heroEyebrow", label: "Kampanya üst yazısı" },
      {
        key: "heroTitle",
        label: "Ana başlık",
        kind: "textarea",
        hint: "Satır sonuyla iki satıra ayırabilirsiniz.",
      },
      { key: "heroSubtitle", label: "Ana açıklama", kind: "textarea" },
      { key: "heroCta", label: "Buton metni" },
      { key: "heroImage", label: "Ana kampanya görseli", kind: "image" },
      { key: "newsletterTitle", label: "Bülten başlığı", full: true },
    ],
  },
  {
    id: "editorial",
    label: "Hikâye & kampanya",
    fields: [
      { key: "editorialEyebrow", label: "Hikâye üst yazısı" },
      { key: "editorialTitle", label: "Hikâye başlığı", kind: "textarea" },
      { key: "editorialText", label: "Hikâye açıklaması", kind: "textarea" },
      { key: "editorialImage", label: "Hikâye görseli", kind: "image" },
      { key: "campaignTitle", label: "Alt kampanya başlığı", kind: "textarea" },
      { key: "campaignText", label: "Alt kampanya açıklaması", kind: "textarea" },
      { key: "campaignImage", label: "Alt kampanya görseli", kind: "image" },
    ],
  },
  {
    id: "contact",
    label: "İletişim",
    fields: [
      { key: "contactEmail", label: "İletişim e-posta" },
      { key: "contactPhone", label: "Telefon" },
      { key: "address", label: "Mağaza adresi", kind: "textarea" },
      { key: "instagramUrl", label: "Instagram HTTPS adresi", required: false },
    ],
  },
  {
    id: "shipping",
    label: "Kargo & havale",
    fields: [
      { key: "shippingFee", label: "Kargo ücreti (TL)", kind: "money" },
      { key: "freeShippingThreshold", label: "Ücretsiz kargo sınırı (TL)", kind: "money" },
      { key: "shippingVatRateBps", label: "Kargo bedeline dahil KDV (%)", kind: "percent" },
      { key: "bankAccountName", label: "Havale hesap adı", required: false },
      {
        key: "bankIban",
        label: "TR IBAN",
        required: false,
        hint: "TR ile başlayan 26 karakterli hesap numarası",
      },
    ],
  },
  {
    id: "policies",
    label: "Bilgilendirme metinleri",
    fields: [
      { key: "privacyText", label: "Gizlilik / kişisel veriler metni", kind: "textarea" },
      { key: "returnsText", label: "Teslimat / iade metni", kind: "textarea" },
      { key: "termsText", label: "Satış koşulları", kind: "textarea" },
    ],
  },
  {
    id: "search",
    label: "Arama görünürlüğü",
    fields: [
      {
        key: "allowIndexing",
        label: "Mağaza arama motorlarında indekslenebilir",
        kind: "checkbox",
        full: true,
        hint: "Ürün, satıcı ve bilgilendirme metinleri hazır olduğunda etkinleştirin.",
      },
      { key: "showGoogleReviews", label: "Google işletme yorumlarını göster", kind: "checkbox" },
      { key: "googlePlaceId", label: "Google işletme Place ID", required: false },
    ],
  },
];

export function ContentAdmin({ initialGroup = "brand" }: { initialGroup?: string }) {
  const { data, error, reload } = useAdminQuery<{
    settings: StoreSettings;
    adminGoogleIntegration: { configured: boolean; enabled: boolean };
  }>("{settings adminGoogleIntegration}");
  const [group, setGroup] = useState(initialGroup);
  const [googleError, setGoogleError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const notice = useAdminNotice();
  const selected = groups.find((item) => item.id === group)!;
  async function save(values: Record<string, unknown>) {
    const input = Object.fromEntries(
      selected.fields.map((field) => [field.key, values[field.key]]),
    );
    await api("mutation($input:JSON!){updateSettings(input:$input)}", { input });
    notice("Mağaza ayarları kaydedildi. Yeni açılan sayfalarda güncel içerik görünür.");
    await reload();
  }
  async function google(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGoogleBusy(true);
    setGoogleError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("mutation($input:JSON!){saveGoogleIntegration(input:$input)}", {
        input: { apiKey: String(form.get("apiKey") ?? ""), enabled: form.get("enabled") === "on" },
      });
      notice("Google Places bağlantı ayarları kaydedildi.");
      await reload();
    } catch (error) {
      setGoogleError(errorMessage(error));
    } finally {
      setGoogleBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">İÇERİK & MAĞAZA</span>
          <h1>Her detay, Quantia.</h1>
          <p>Marka görünümü, kampanyalar, iletişim ve ticari ayarlar.</p>
        </div>
      </div>
      <div className="admin-tabs">
        {groups.map((item) => (
          <button
            key={item.id}
            className={group === item.id ? "selected" : ""}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      {data && (
        <section className="admin-panel">
          <h2>{selected.label}</h2>
          <EntityForm
            key={group}
            initial={{ ...data.settings }}
            fields={selected.fields}
            onSave={save}
          />
        </section>
      )}
      {group === "search" && data && (
        <section className="admin-panel">
          <h2>Google Places bağlantısı</h2>
          <p className="admin-description">
            Gerçek işletme puanı ve yorumları Google Places üzerinden alınır. API anahtarı şifreli
            saklanır.
          </p>
          <form className="admin-subform" onSubmit={google}>
            <Field
              label="Google Places API anahtarı"
              name="apiKey"
              type="password"
              autoComplete="new-password"
              placeholder={
                data.adminGoogleIntegration.configured
                  ? "Kayıtlı · değiştirmek için yenisini girin"
                  : "Google Cloud API anahtarı"
              }
            />
            <label className="check-label">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={data.adminGoogleIntegration.enabled}
              />{" "}
              Bağlantıyı etkinleştir
            </label>
            {googleError && <Notice>{googleError}</Notice>}
            <button className="button" disabled={googleBusy}>
              Google ayarlarını kaydet
            </button>
          </form>
        </section>
      )}
    </>
  );
}
