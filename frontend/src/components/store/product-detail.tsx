"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { errorMessage, money } from "@/lib/format";
import { Photo } from "../ui/photo";
import { Notice } from "../ui/notice";
import { useShop } from "./shop-provider";

export function ProductDetail({ product }: { product: Product }) {
  const { adjustItem, busy, openCart, settings } = useShop();
  const [colorId, setColor] = useState(product.variants[0]?.colorId ?? "");
  const [sizeId, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImage] = useState(0);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const colors = [
    ...new Map(product.variants.map((variant) => [variant.colorId, variant])).values(),
  ];
  const choices = product.variants.filter((variant) => variant.colorId === colorId);
  const selected = choices.find((variant) => variant.sizeId === sizeId);
  const color = colors.find((variant) => variant.colorId === colorId);
  const filteredMedia = product.media.filter(
    (image) => !image.colorId || image.colorId === colorId,
  );
  const media = filteredMedia.length ? filteredMedia : product.media;
  const currentImage = media[Math.min(imageIndex, media.length - 1)]!;
  const price = selected?.price ?? product.price;

  async function add() {
    setError("");
    if (!selected) {
      setError("Lütfen bir beden seçin.");
      return;
    }
    setAdding(true);
    try {
      await adjustItem(selected.id, quantity);
      openCart();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div className="detail-main-photo">
          <Photo
            src={currentImage.url}
            alt={currentImage.alt}
            priority
            sizes="(max-width: 760px) 100vw, 55vw"
          />
          {product.badge && <span className="product-badge">{product.badge}</span>}
        </div>
        {media.length > 1 && (
          <div className="gallery-thumbnails">
            {media.map((image, index) => (
              <button
                key={image.id}
                className={index === imageIndex ? "selected" : ""}
                aria-label={`${index + 1}. görsel`}
                onClick={() => setImage(index)}
              >
                <Photo src={image.url} alt={image.alt} sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-description">
        <div className="breadcrumbs">
          <Link href="/">Ana sayfa</Link>
          <ChevronRight size={11} />
          <Link href={`/koleksiyon?kategori=${product.category.slug}`}>
            {product.category.name}
          </Link>
        </div>
        <span className="eyebrow">QUANTIA · ZAMANSIZ SEÇKİ</span>
        <h1>{product.name}</h1>
        <p className="detail-subtitle">{product.subtitle}</p>
        <div className="detail-price">
          <strong>{money(price)}</strong>
          {product.compareAtPrice && product.compareAtPrice > price && (
            <s>{money(product.compareAtPrice)}</s>
          )}
        </div>
        <p className="detail-intro">{product.description}</p>
        <div className="option-heading">
          <strong>Renk</strong>
          <span>{color?.color}</span>
        </div>
        <div className="color-options">
          {colors.map((variant) => (
            <button
              key={variant.colorId}
              className={variant.colorId === colorId ? "chosen" : ""}
              style={{ "--swatch": variant.colorHex } as React.CSSProperties}
              aria-label={variant.color}
              aria-pressed={variant.colorId === colorId}
              onClick={() => {
                setColor(variant.colorId);
                setSize("");
                setImage(0);
              }}
            >
              {variant.colorId === colorId && <Check size={14} />}
            </button>
          ))}
        </div>
        <div className="option-heading">
          <strong>Beden</strong>
          <a href="#beden-rehberi">
            <Ruler size={14} /> Beden rehberi
          </a>
        </div>
        <div className="size-options">
          {choices.map((variant) => (
            <button
              key={variant.id}
              aria-pressed={variant.sizeId === sizeId}
              className={variant.sizeId === sizeId ? "chosen" : ""}
              disabled={!variant.stock}
              onClick={() => {
                setSize(variant.sizeId);
                setError("");
              }}
            >
              {variant.size}
            </button>
          ))}
        </div>
        {selected && (
          <p className="stock-note">
            {selected.stock > 0 ? (
              <>
                <span /> Stokta ·{" "}
                {selected.stock <= 3 ? `Son ${selected.stock} adet` : "Sizin için hazır"}
              </>
            ) : (
              "Bu seçim şu anda tükenmiş."
            )}
          </p>
        )}
        {error && <Notice>{error}</Notice>}
        <div className="detail-actions">
          <div className="quantity">
            <button
              aria-label="Adedi azalt"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              <Minus size={14} />
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Adedi artır"
              disabled={quantity >= Math.min(10, selected?.stock ?? 10)}
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            className="button"
            onClick={() => void add()}
            disabled={busy || adding || selected?.stock === 0}
          >
            {adding ? "Ekleniyor…" : "Çantama ekle"}
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="product-assurances">
          <span>
            <Truck size={18} /> {money(settings.freeShippingThreshold)} üzeri kargo bizden
          </span>
          <span>
            <ShieldCheck size={18} /> Güvenli ödeme akışı
          </span>
        </div>
        <details open>
          <summary>Detaylar & doku</summary>
          <p>{product.material}</p>
          <p>{product.description}</p>
        </details>
        <details>
          <summary>Bakım önerileri</summary>
          <p>{product.care}</p>
        </details>
        <details id="beden-rehberi">
          <summary>Beden rehberi</summary>
          <p>
            Kesim bilgisi: {product.subtitle}. Bedenler ürünün standart ölçü etiketini gösterir.
            Ölçü desteği için <Link href="/iletisim">bizimle iletişime geçin</Link>.
          </p>
        </details>
        <details>
          <summary>Teslimat & iade</summary>
          <p>
            Kargo, teslimat ve iade koşullarının tamamını{" "}
            <Link href="/bilgilendirme/iade">buradan inceleyebilirsiniz</Link>.
          </p>
        </details>
      </div>
    </div>
  );
}
