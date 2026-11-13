"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Package, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { orderFields } from "@/lib/queries";
import type { Order } from "@/lib/types";
import { date, errorMessage, money, statusLabels } from "@/lib/format";
import { useShop } from "./shop-provider";
import { Notice } from "../ui/notice";

export function OrderReceipt({ token, initialOrder }: { token: string; initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { settings } = useShop();

  useEffect(() => {
    if (order.status !== "PENDING_PAYMENT") return;
    const timer = setInterval(() => {
      void api<{ orderReceipt: Order | null }>(
        `query($token:String!){orderReceipt(token:$token){${orderFields}}}`,
        { token },
      )
        .then((data) => {
          if (data.orderReceipt) setOrder(data.orderReceipt);
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [token, order.status]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ retryPayment: { paymentUrl: string | null } }>(
        "mutation($token:String!){retryPayment(token:$token){paymentUrl}}",
        { token },
      );
      if (data.retryPayment.paymentUrl) window.location.assign(data.retryPayment.paymentUrl);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="receipt-page page-container">
      <div className="receipt-icon">
        {order.status === "CANCELLED" ? (
          <Package size={30} strokeWidth={1} />
        ) : (
          <Check size={30} strokeWidth={1} />
        )}
      </div>
      <span className="eyebrow">QUANTIA · {order.number}</span>
      <h1>
        {order.status === "CANCELLED"
          ? "Siparişiniz kapatıldı."
          : order.status === "PENDING_PAYMENT"
            ? "Seçkiniz ayrıldı."
            : "İyi bir seçimdi."}
      </h1>
      <p>
        {order.paymentStatus === "DEMO"
          ? "Demo siparişiniz oluşturuldu. Gerçek tahsilat yapılmadı."
          : order.status === "PENDING_PAYMENT"
            ? "Ödeme doğrulandıktan sonra siparişiniz onaylanacak."
            : order.status === "CANCELLED"
              ? "Bu siparişin rezervasyonu sona erdi veya sipariş iptal edildi."
              : "Siparişiniz alındı. Hazırlık sürecini bu sayfadan takip edebilirsiniz."}
      </p>
      <div className="receipt-status">
        <span>{statusLabels[order.status]}</span>
        <span>{statusLabels[order.paymentStatus] ?? order.paymentStatus}</span>
      </div>
      {order.paymentProvider === "BANK_TRANSFER" && order.status === "PENDING_PAYMENT" && (
        <div className="bank-details">
          <h2>Havale / EFT bilgileri</h2>
          <p>{settings.bankAccountName}</p>
          <strong>{settings.bankIban}</strong>
          <p>
            Açıklamaya <b>{order.number}</b> sipariş numarasını ekleyin. Banka kontrolünden sonra
            siparişiniz onaylanır.
          </p>
        </div>
      )}
      {order.paymentStatus === "REFUND_REQUIRED" && (
        <Notice>
          Siparişiniz için iade kontrolü gerekiyor. Lütfen sipariş numaranızla mağazaya ulaşın.
        </Notice>
      )}
      <div className="receipt-details">
        <div>
          <span className="eyebrow">SEÇTİĞİNİZ PARÇALAR</span>
          {order.items.map((item) => (
            <div className="summary-line" key={item.id}>
              <span>
                {item.name}
                <small>
                  {item.color} / {item.size} · {item.quantity} adet
                </small>
              </span>
              <strong>{money(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
          {order.discountAmount > 0 && (
            <div className="summary-line discount">
              <span>İndirim</span>
              <span>−{money(order.discountAmount)}</span>
            </div>
          )}
          <div className="summary-line">
            <span>Kargo</span>
            <span>{order.shipping ? money(order.shipping) : "Bizden"}</span>
          </div>
          <div className="summary-line summary-total">
            <span>Toplam</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>
        <div>
          <span className="eyebrow">TESLİMAT BİLGİLERİ</span>
          <h3>{order.customerName}</h3>
          <p>
            {order.address}
            <br />
            {order.district} / {order.city} · {order.postalCode}
          </p>
          <p>
            {order.email}
            <br />
            {order.phone}
          </p>
          {order.trackingNumber && (
            <p>
              <b>{order.shippingCarrier}</b>
              <br />
              Takip numarası: {order.trackingNumber}
            </p>
          )}
          {order.invoiceUrl && (
            <a
              className="text-link"
              href={order.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Faturayı görüntüle <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
      <div className="order-timeline">
        {order.history.map((item, index) => (
          <div key={`${index}-${item.createdAt}`}>
            <span />
            <strong>{statusLabels[item.status]}</strong>
            <small>{date(item.createdAt)}</small>
            {item.note && <p>{item.note}</p>}
          </div>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      <div className="receipt-actions">
        {order.status === "PENDING_PAYMENT" && order.paymentProvider !== "BANK_TRANSFER" && (
          <button className="button" disabled={busy} onClick={() => void pay()}>
            <RefreshCw size={16} /> Ödemeye devam et
          </button>
        )}
        <Link className="button button-outline" href="/koleksiyon">
          Koleksiyona dön <ArrowRight size={16} />
        </Link>
      </div>
      <p className="fine-print">
        Bu bağlantı sipariş bilgilerinize erişim sağlar; yalnızca güvendiğiniz kişilerle paylaşın.
      </p>
    </section>
  );
}
