"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { orderFields } from "@/lib/queries";
import type { CustomerAddress, Order } from "@/lib/types";
import { date, errorMessage, money, statusLabels } from "@/lib/format";
import { useShop } from "./shop-provider";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

export function Account() {
  const { user, refresh, notify } = useShop();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressForm, setAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);

  async function load() {
    const data = await api<{ myOrders: Order[]; myAddresses: CustomerAddress[] }>(
      `{myOrders{${orderFields}} myAddresses{id label fullName phone address city district postalCode isDefault}}`,
    );
    setOrders(data.myOrders);
    setAddresses(data.myAddresses);
  }
  useEffect(() => {
    if (user) void load().catch((error) => setError(errorMessage(error)));
  }, [user?.id]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = {
      email: form.get("email"),
      password: form.get("password"),
      ...(register ? { name: form.get("name") } : {}),
    };
    try {
      await api(
        `mutation($input:${register ? "RegisterInput" : "LoginInput"}!){${register ? "register" : "login"}(input:$input){id}}`,
        { input },
      );
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = {
      ...(editingAddress ? { id: editingAddress.id } : {}),
      label: form.get("label"),
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      address: form.get("address"),
      city: form.get("city"),
      district: form.get("district"),
      postalCode: form.get("postalCode"),
      isDefault: form.get("isDefault") === "on",
    };
    try {
      await api("mutation($input:JSON!){saveAddress(input:$input){id}}", { input });
      await load();
      setAddressForm(false);
      setEditingAddress(null);
      notify("Adresiniz kaydedildi.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(id: string) {
    try {
      await api("mutation($id:ID!){deleteAddress(id:$id)}", { id });
      await load();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  async function logout() {
    await api("mutation{logout}");
    await refresh();
    setOrders([]);
    setAddresses([]);
  }

  if (!user)
    return (
      <div className="auth-page">
        <span className="eyebrow">SİZE AİT BİR ALAN</span>
        <h1>{register ? "Quantia'ya hoş geldiniz." : "Yeniden merhaba."}</h1>
        <p>
          {register
            ? "Yeni seçkilerinize ve siparişlerinize tek yerden ulaşın."
            : "Siparişleriniz ve adresleriniz burada sizi bekliyor."}
        </p>
        <div className="auth-tabs">
          <button
            className={!register ? "selected" : ""}
            onClick={() => {
              setRegister(false);
              setError("");
            }}
          >
            Giriş yap
          </button>
          <button
            className={register ? "selected" : ""}
            onClick={() => {
              setRegister(true);
              setError("");
            }}
          >
            Üye ol
          </button>
        </div>
        <form onSubmit={login}>
          {register && (
            <Field label="Ad soyad" name="name" autoComplete="name" required maxLength={100} />
          )}
          <Field label="E-posta" name="email" type="email" autoComplete="email" required />
          <Field
            label="Şifre"
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 12 : 1}
            maxLength={128}
            required
            hint={register ? "En az 12 karakter kullanın." : undefined}
          />
          {error && <Notice>{error}</Notice>}
          <button className="button button-full" disabled={busy}>
            {busy ? "Bir an…" : register ? "Hesap oluştur" : "Giriş yap"}
            <ArrowRight size={16} />
          </button>
        </form>
        <Link className="text-link auth-support" href="/iletisim">
          Hesabınızla ilgili destek alın
        </Link>
      </div>
    );

  return (
    <div className="account-page page-container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">QUANTIA HESABINIZ</span>
          <h1>Merhaba, {user.name.split(" ")[0]}.</h1>
        </div>
        <button className="text-link" onClick={() => void logout()}>
          <LogOut size={15} /> Çıkış yap
        </button>
      </div>
      {user.role === "ADMIN" && (
        <Link className="button button-outline" href="/yonetim">
          Yönetim paneline geç <ArrowRight size={16} />
        </Link>
      )}
      {error && <Notice>{error}</Notice>}
      <section className="account-section">
        <h2>Siparişleriniz</h2>
        {!orders.length ? (
          <div className="account-empty">
            <p>İlk Quantia seçkiniz burada yerini alacak.</p>
            <Link className="text-link" href="/koleksiyon">
              Koleksiyonu keşfet <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <details className="account-order" key={order.id}>
              <summary>
                <strong>{order.number}</strong>
                <span>{date(order.createdAt)}</span>
                <span>{statusLabels[order.status]}</span>
                <strong>{money(order.total)}</strong>
              </summary>
              <div className="account-order-body">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.name} · {item.color} / {item.size} · {item.quantity} adet
                  </p>
                ))}
                <p>
                  {order.address}, {order.district} / {order.city}
                </p>
                <p>{statusLabels[order.paymentStatus] ?? order.paymentStatus}</p>
                {order.trackingNumber && (
                  <p>
                    Kargo: {order.shippingCarrier} · {order.trackingNumber}
                  </p>
                )}
                {order.invoiceUrl && (
                  <a
                    className="text-link"
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Faturayı görüntüle
                  </a>
                )}
              </div>
            </details>
          ))
        )}
      </section>
      <section className="account-section">
        <div className="section-heading">
          <h2>Adresleriniz</h2>
          <button
            className="text-link"
            onClick={() => {
              setEditingAddress(null);
              setAddressForm(!addressForm);
            }}
          >
            <Plus size={16} /> Yeni adres
          </button>
        </div>
        <div className="address-grid">
          {addresses.map((address) => (
            <article key={address.id}>
              <div>
                <h3>{address.label}</h3>
                <button
                  className="icon-button"
                  aria-label={`${address.label} adresini düzenle`}
                  onClick={() => {
                    setEditingAddress(address);
                    setAddressForm(true);
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${address.label} adresini sil`}
                  onClick={() => void removeAddress(address.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {address.isDefault && <span className="eyebrow">VARSAYILAN</span>}
              <p>
                {address.fullName}
                <br />
                {address.address}
                <br />
                {address.district} / {address.city} {address.postalCode}
                <br />
                {address.phone}
              </p>
            </article>
          ))}
        </div>
        {addressForm && (
          <form
            key={editingAddress?.id ?? "new-address"}
            className="address-form"
            onSubmit={saveAddress}
          >
            <div className="form-grid">
              <Field
                label="Adres başlığı"
                name="label"
                placeholder="Ev, iş…"
                defaultValue={editingAddress?.label}
                required
              />
              <Field
                label="Ad soyad"
                name="fullName"
                defaultValue={editingAddress?.fullName ?? user.name}
                required
              />
              <Field
                label="Telefon"
                name="phone"
                type="tel"
                defaultValue={editingAddress?.phone}
                required
              />
              <Field
                label="Açık adres"
                name="address"
                minLength={10}
                defaultValue={editingAddress?.address}
                required
              />
              <Field label="İl" name="city" defaultValue={editingAddress?.city} required />
              <Field
                label="İlçe"
                name="district"
                defaultValue={editingAddress?.district}
                required
              />
              <Field
                label="Posta kodu"
                name="postalCode"
                pattern="[0-9]{5}"
                defaultValue={editingAddress?.postalCode}
                required
              />
            </div>
            <label className="check-label">
              <input type="checkbox" name="isDefault" defaultChecked={editingAddress?.isDefault} />{" "}
              Varsayılan adresim olsun
            </label>
            <button className="button" disabled={busy}>
              Adresi kaydet
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                setAddressForm(false);
                setEditingAddress(null);
              }}
            >
              Vazgeç
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
