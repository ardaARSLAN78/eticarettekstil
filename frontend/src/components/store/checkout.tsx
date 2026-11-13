"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useShop } from "./shop-provider";
import { api, ApiError } from "@/lib/api";
import { cartFields, orderFields } from "@/lib/queries";
import type { Cart, Order, PaymentMethod } from "@/lib/types";
import { errorMessage, money } from "@/lib/format";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { Photo } from "../ui/photo";

export function Checkout() {
  const { cart, user, refresh, notify } = useShop();
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [couponBusy, setCouponBusy] = useState(false);
  const [corporate, setCorporate] = useState(false);
  const key = useRef<string | null>(null);

  useEffect(() => {
    api<{ paymentMethods: PaymentMethod[] }>("{paymentMethods{provider label sandbox}}")
      .then((data) => {
        setMethods(data.paymentMethods);
        setProvider(data.paymentMethods[0]?.provider ?? "");
      })
      .catch((error) => setError(errorMessage(error)));
  }, []);

  async function coupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCouponBusy(true);
    setError("");
    try {
      await api<{ applyCoupon: Cart }>(
        `mutation($code:String!){applyCoupon(code:$code){${cartFields}}}`,
        { code: new FormData(event.currentTarget).get("code") },
      );
      await refresh();
      notify("Kupon güncellendi.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    key.current ??= crypto.randomUUID();
    const input = {
      idempotencyKey: key.current,
      email: form.get("email"),
      customerName: form.get("customerName"),
      phone: form.get("phone"),
      address: form.get("address"),
      city: form.get("city"),
      district: form.get("district"),
      postalCode: form.get("postalCode"),
      paymentProvider: provider,
      termsAccepted: form.get("terms") === "on",
      ...(provider === "IYZICO" ? { identityNumber: form.get("identityNumber") } : {}),
      ...(corporate
        ? {
            billingDetails: {
              type: "COMPANY",
              name: form.get("companyName"),
              address: form.get("billingAddress"),
              taxOffice: form.get("taxOffice"),
              taxNumber: form.get("taxNumber"),
            },
          }
        : {}),
    };
    try {
      const data = await api<{
        checkout: { order: Order; receiptToken: string; paymentUrl: string | null };
      }>(
        `mutation($input:CheckoutInput!){checkout(input:$input){receiptToken paymentUrl order{${orderFields}}}}`,
        { input },
      );
      await refresh();
      if (data.checkout.paymentUrl) {
        window.location.assign(data.checkout.paymentUrl);
        return;
      }
      router.push(`/siparis/${data.checkout.receiptToken}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "PAYMENT_FAILED") {
        key.current = null;
        await refresh().catch(() => undefined);
      }
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!cart) return <div className="empty-state">Çantanız hazırlanıyor…</div>;
  if (!cart.items.length)
    return (
      <div className="empty-state">
        <h1>Çantanız yeni bir hikâye bekliyor.</h1>
        <Link className="button" href="/koleksiyon">
          Koleksiyonu keşfet <ArrowRight size={17} />
        </Link>
      </div>
    );
  const method = methods?.find((item) => item.provider === provider);

  return (
    <div className="checkout-page page-container">
      <div className="checkout-heading">
        <Link className="text-link" href="/koleksiyon">
          <ArrowLeft size={14} /> Koleksiyona dön
        </Link>
        <h1>Son bir dokunuş.</h1>
        <p>Seçkinizi size ulaştırmak için birkaç bilgi.</p>
      </div>
      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={submit}>
          <section>
            <span className="step-number">01</span>
            <h2>İletişim bilgileriniz</h2>
            <div className="form-grid">
              <Field
                label="Ad soyad"
                name="customerName"
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={user?.name}
              />
              <Field
                label="E-posta"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={100}
                defaultValue={user?.email}
              />
              <Field
                label="Telefon"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="05xx xxx xx xx"
                maxLength={20}
              />
            </div>
          </section>
          <section>
            <span className="step-number">02</span>
            <h2>Teslimat adresiniz</h2>
            <div className="form-grid">
              <label className="field full-field">
                <span>Açık adres</span>
                <textarea
                  name="address"
                  autoComplete="street-address"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                />
              </label>
              <Field label="İl" name="city" autoComplete="address-level1" required maxLength={80} />
              <Field
                label="İlçe"
                name="district"
                autoComplete="address-level2"
                required
                maxLength={80}
              />
              <Field
                label="Posta kodu"
                name="postalCode"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                required
              />
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={corporate}
                onChange={(event) => setCorporate(event.target.checked)}
              />{" "}
              Kurumsal fatura istiyorum
            </label>
            {corporate && (
              <div className="form-grid billing-fields">
                <Field label="Şirket unvanı" name="companyName" required />
                <Field label="Vergi dairesi" name="taxOffice" required />
                <Field
                  label="Vergi numarası"
                  name="taxNumber"
                  inputMode="numeric"
                  pattern="[0-9]{10,11}"
                  required
                />
                <Field label="Fatura adresi" name="billingAddress" required />
              </div>
            )}
          </section>
          <section>
            <span className="step-number">03</span>
            <h2>Ödeme tercihiniz</h2>
            {methods === null ? (
              <p>Ödeme yöntemleri hazırlanıyor…</p>
            ) : !methods.length ? (
              <Notice>
                Şu anda açık bir ödeme yöntemi bulunmuyor. Lütfen mağazayla iletişime geçin.
              </Notice>
            ) : (
              <div className="payment-methods">
                {methods.map((item) => (
                  <label key={item.provider} className={provider === item.provider ? "chosen" : ""}>
                    <input
                      type="radio"
                      name="paymentProvider"
                      checked={provider === item.provider}
                      onChange={() => setProvider(item.provider)}
                    />
                    <span>{item.label}</span>
                    {item.sandbox && <small>TEST</small>}
                    <ShieldCheck size={17} />
                  </label>
                ))}
              </div>
            )}
            {method?.sandbox && (
              <div className="demo-notice">
                Bu yöntem test ortamındadır. Gerçek tahsilat yapılmaz.
              </div>
            )}
            {provider === "IYZICO" && (
              <Field
                label="T.C. kimlik numarası"
                hint="iyzico alıcı doğrulaması için şifreli iletilir; işlem kesinleşince kaldırılır."
                name="identityNumber"
                inputMode="numeric"
                pattern="[1-9][0-9]{10}"
                maxLength={11}
                autoComplete="off"
                required
              />
            )}
            <label className="check-label terms-label">
              <input name="terms" type="checkbox" required />
              <span>
                <Link href="/bilgilendirme/satis" target="_blank">
                  Satış koşullarını
                </Link>{" "}
                ve{" "}
                <Link href="/bilgilendirme/gizlilik" target="_blank">
                  gizlilik metnini
                </Link>{" "}
                okudum, kabul ediyorum.
              </span>
            </label>
            {error && <Notice>{error}</Notice>}
            <button
              className="button button-full"
              disabled={busy || !provider || !cart.items.every((item) => item.available)}
            >
              {busy
                ? "Siparişiniz hazırlanıyor…"
                : provider === "DEMO"
                  ? "Demo siparişi oluştur"
                  : provider === "BANK_TRANSFER"
                    ? "Havale siparişini oluştur"
                    : "Güvenli ödemeye geç"}
              <ArrowRight size={17} />
            </button>
            <p className="fine-print">
              <LockKeyhole size={12} /> Kart bilgileriniz ödeme kuruluşunun güvenli ekranında
              işlenir.
            </p>
          </section>
        </form>
        <aside className="checkout-summary">
          <span className="eyebrow">SİZİN SEÇKİNİZ</span>
          <h2>Sipariş özeti</h2>
          <div className="checkout-items">
            {cart.items.map((item) => (
              <div key={item.id} className="checkout-item">
                <div className="checkout-item-photo">
                  <Photo src={item.image} alt={item.name} sizes="75px" />
                  <span>{item.quantity}</span>
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.color} / {item.size}
                  </p>
                  {!item.available && <span className="field-error">Seçim stokta yok</span>}
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <form className="coupon-form" onSubmit={coupon}>
            <input
              name="code"
              placeholder="Kupon kodunuz"
              aria-label="Kupon kodu"
              maxLength={30}
              defaultValue={cart.couponCode ?? ""}
            />
            <button type="submit" disabled={couponBusy}>
              {couponBusy ? "…" : "Uygula"}
            </button>
          </form>
          {cart.couponCode && (
            <p className="coupon-applied">
              {cart.couponCode}
              {cart.couponError ? ` · ${cart.couponError}` : " uygulandı"}
            </p>
          )}
          <div className="summary-line">
            <span>Ara toplam</span>
            <span>{money(cart.subtotal)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="summary-line discount">
              <span>{cart.campaignName ?? "İndirim"}</span>
              <span>−{money(cart.discountAmount)}</span>
            </div>
          )}
          <div className="summary-line">
            <span>Kargo</span>
            <span>{cart.shipping ? money(cart.shipping) : "Bizden"}</span>
          </div>
          <div className="summary-line summary-total">
            <span>Toplam</span>
            <strong>{money(cart.total)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
