"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { orderFields } from "@/lib/queries";
import type { Order } from "@/lib/types";
import { date, errorMessage, money, statusLabels } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

function OrderEditor({ order, onDone }: { order: Order; onDone: () => Promise<void> }) {
  const notice = useAdminNotice();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = (transitions[order.status] ?? []).filter(
    (status) =>
      !(
        order.status === "PENDING_PAYMENT" &&
        status === "CONFIRMED" &&
        order.paymentProvider !== "BANK_TRANSFER"
      ),
  );
  const [status, setStatus] = useState(options[0] ?? "");
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await api(
        "mutation($id:ID!,$status:String!,$trackingNumber:String,$shippingCarrier:String){updateOrderStatus(id:$id,status:$status,trackingNumber:$trackingNumber,shippingCarrier:$shippingCarrier){id}}",
        {
          id: order.id,
          status,
          trackingNumber: fields.get("trackingNumber") || null,
          shippingCarrier: fields.get("shippingCarrier") || null,
        },
      );
      notice("Sipariş durumu güncellendi.");
      await onDone();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function invoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await api(
        "mutation($id:ID!,$invoiceNumber:String!,$invoiceUrl:String!){updateInvoice(id:$id,invoiceNumber:$invoiceNumber,invoiceUrl:$invoiceUrl){id}}",
        {
          id: order.id,
          invoiceNumber: fields.get("invoiceNumber"),
          invoiceUrl: fields.get("invoiceUrl"),
        },
      );
      notice("Fatura bilgileri kaydedildi.");
      await onDone();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <span className="eyebrow">{date(order.createdAt)}</span>
          <h2>{order.number}</h2>
        </div>
        <button className="text-link" onClick={() => void onDone()}>
          Listeye dön
        </button>
      </div>
      <div className="admin-order-details">
        <div>
          <h3>{order.customerName}</h3>
          <p>
            {order.email}
            <br />
            {order.phone}
          </p>
          <p>
            {order.address}
            <br />
            {order.district} / {order.city} {order.postalCode}
          </p>
        </div>
        <div>
          <span className="status-pill">{statusLabels[order.status]}</span>
          <p>
            {order.paymentProvider} · {statusLabels[order.paymentStatus]}
          </p>
          <strong>{money(order.total)}</strong>
          {order.paymentStatus === "REFUND_REQUIRED" && (
            <Notice>
              Sağlayıcı panelinden iade kontrolünü tamamlayın. İptal işlemi otomatik para iadesi
              yapmaz.
            </Notice>
          )}
        </div>
      </div>
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Renk / beden</th>
              <th>SKU</th>
              <th>Adet</th>
              <th>Birim fiyat</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>
                  {item.color} / {item.size}
                </td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-order-totals">
        <span>Ürünler: {money(order.subtotal)}</span>
        <span>İndirim: {money(order.discountAmount)}</span>
        <span>Kargo: {money(order.shipping)}</span>
        <strong>Toplam: {money(order.total)}</strong>
      </div>
      {options.length > 0 && (
        <form className="admin-subform" onSubmit={update}>
          <h3>Durum güncelle</h3>
          <label className="field">
            <span>Yeni durum</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {options.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          {status === "SHIPPED" && (
            <div className="form-grid">
              <Field label="Kargo firması" name="shippingCarrier" required />
              <Field label="Takip numarası" name="trackingNumber" required />
            </div>
          )}
          <button className="button" disabled={busy}>
            Durumu kaydet
          </button>
        </form>
      )}
      <form className="admin-subform" onSubmit={invoice}>
        <h3>Fatura bilgileri</h3>
        <p>Mevcut e-fatura/e-arşiv belgesini siparişe ekleyin.</p>
        <div className="form-grid">
          <Field
            label="Fatura numarası"
            name="invoiceNumber"
            defaultValue={order.invoiceNumber ?? ""}
            required
          />
          <Field
            label="Fatura HTTPS bağlantısı"
            name="invoiceUrl"
            type="url"
            defaultValue={order.invoiceUrl ?? ""}
            required
          />
        </div>
        <button className="button button-outline" disabled={busy}>
          Faturayı kaydet
        </button>
      </form>
      {error && <Notice>{error}</Notice>}
      <div className="order-timeline">
        {order.history.map((item, index) => (
          <div key={index}>
            <strong>{statusLabels[item.status]}</strong>
            <small>{date(item.createdAt)}</small>
            {item.note && <p>{item.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function OrdersAdmin() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAdminQuery<{ adminOrders: Order[] }>(
    `query($page:Int){adminOrders(page:$page){${orderFields}}}`,
    { page },
  );
  const [selected, setSelected] = useState<Order | null>(null);
  if (selected)
    return (
      <OrderEditor
        key={selected.id}
        order={selected}
        onDone={async () => {
          setSelected(null);
          await reload();
        }}
      />
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">SİPARİŞ YÖNETİMİ</span>
          <h1>Siparişler</h1>
          <p>Ödeme, hazırlık, kargo ve fatura bilgileri.</p>
        </div>
        <button className="button button-outline" onClick={() => void reload()}>
          Yenile
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      <section className="admin-panel">
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Müşteri</th>
                <th>Tutar</th>
                <th>Ödeme</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.adminOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.number}</strong>
                    <small>{date(order.createdAt)}</small>
                  </td>
                  <td>
                    {order.customerName}
                    <small>{order.email}</small>
                  </td>
                  <td>{money(order.total)}</td>
                  <td>
                    {order.paymentProvider}
                    <small>{statusLabels[order.paymentStatus]}</small>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${order.status === "CANCELLED" ? "warning" : ""}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td>
                    <button className="text-link" onClick={() => setSelected(order)}>
                      İncele
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.adminOrders.length === 0 && <p className="admin-empty">Bu sayfada sipariş yok.</p>}
        <div className="admin-pagination">
          <button className="text-link" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Önceki
          </button>
          <span>Sayfa {page}</span>
          <button
            className="text-link"
            disabled={(data?.adminOrders.length ?? 0) < 50}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </button>
        </div>
      </section>
    </>
  );
}
