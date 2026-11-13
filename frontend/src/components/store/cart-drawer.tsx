"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useShop } from "./shop-provider";
import { Photo } from "../ui/photo";
import { errorMessage, money } from "@/lib/format";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { cart, busy, setItem, adjustItem, refresh, notify } = useShop();

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function update(id: string, quantity: number, relative = false) {
    try {
      await (relative ? adjustItem(id, quantity) : setItem(id, quantity));
    } catch (error) {
      notify(errorMessage(error));
    }
  }

  return (
    <dialog ref={dialog} className="cart-drawer" onClose={onClose} aria-labelledby="cart-title">
      <div className="drawer-heading">
        <div>
          <span className="eyebrow">SİZİN SEÇKİNİZ</span>
          <h2 id="cart-title">
            Alışveriş çantanız <small>({cart?.itemCount ?? 0})</small>
          </h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Sepeti kapat">
          <X size={22} />
        </button>
      </div>
      {!cart ? (
        <div className="empty-state">
          <p>Çantanız hazırlanıyor…</p>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => void refresh().catch((error) => notify(errorMessage(error)))}
          >
            Yeniden yükle
          </button>
        </div>
      ) : !cart.items.length ? (
        <div className="drawer-empty">
          <ShoppingBag size={46} strokeWidth={1} />
          <h3>Henüz bir seçkiniz yok.</h3>
          <p>Zamansız parçalarınızı keşfetmeye başlayın.</p>
          <Link href="/koleksiyon" className="button" onClick={onClose}>
            Koleksiyona göz at <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="shipping-progress">
            <p>
              {cart.subtotal - cart.discountAmount >= cart.freeShippingThreshold
                ? "Kargo bizden. Keyifli alışverişler."
                : `Ücretsiz kargoya ${money(Math.max(0, cart.freeShippingThreshold - cart.subtotal + cart.discountAmount))} kaldı.`}
            </p>
            <progress
              value={Math.min(cart.subtotal - cart.discountAmount, cart.freeShippingThreshold)}
              max={Math.max(1, cart.freeShippingThreshold)}
            />
          </div>
          <div className="drawer-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <Link className="cart-photo" href={`/urun/${item.slug}`} onClick={onClose}>
                  <Photo src={item.image} alt={item.name} sizes="110px" />
                </Link>
                <div className="cart-item-body">
                  <Link href={`/urun/${item.slug}`} onClick={onClose}>
                    <h3>{item.name}</h3>
                  </Link>
                  <p>
                    {item.color} / {item.size}
                  </p>
                  <strong>{money(item.unitPrice)}</strong>
                  {!item.available && <p className="field-error">Bu seçim artık stokta yok.</p>}
                  <div className="quantity-row">
                    <div className="quantity">
                      <button
                        aria-label={`${item.name} miktarını azalt`}
                        disabled={busy}
                        onClick={() => void update(item.variantId, -1, true)}
                      >
                        <Minus size={12} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`${item.name} miktarını artır`}
                        disabled={busy || item.quantity >= Math.min(10, item.stock)}
                        onClick={() => void update(item.variantId, 1, true)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`${item.name} sepetten kaldır`}
                      disabled={busy}
                      onClick={() => void update(item.variantId, 0)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="drawer-bottom">
            <div className="summary-line">
              <span>Ara toplam</span>
              <span>{money(cart.subtotal)}</span>
            </div>
            {cart.discountAmount > 0 && (
              <div className="summary-line discount">
                <span>İndirim</span>
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
            <Link href="/odeme" className="button button-full" onClick={onClose}>
              Siparişi tamamla <ArrowRight size={17} />
            </Link>
            <p className="fine-print">Ödeme adımında güncel fiyat ve stok tekrar kontrol edilir.</p>
          </div>
        </>
      )}
    </dialog>
  );
}
