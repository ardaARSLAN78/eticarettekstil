import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { Photo } from "../ui/photo";

export function ProductCard({ product }: { product: Product }) {
  const colors = [
    ...new Map(product.variants.map((variant) => [variant.colorId, variant])).values(),
  ];
  const prices = product.variants
    .filter((variant) => variant.active)
    .map((variant) => variant.price ?? product.price);
  const price = prices.length ? Math.min(...prices) : product.price;

  return (
    <article className="product-card">
      <Link
        href={`/urun/${product.slug}`}
        className="product-image-link"
        aria-label={`${product.name} ürününü incele`}
      >
        <Photo src={product.images[0]!} alt={product.media[0]?.alt ?? product.name} />
        {product.badge && (
          <span className={`product-badge ${product.compareAtPrice ? "badge-sale" : ""}`}>
            {product.badge}
          </span>
        )}
        <span className="product-quick">
          <ArrowUpRight size={19} />
        </span>
        <span className="product-image-cta">
          Parçayı keşfet <ArrowUpRight size={15} />
        </span>
      </Link>
      <div className="product-card-info">
        <div>
          <h3>
            <Link href={`/urun/${product.slug}`}>{product.name}</Link>
          </h3>
          <p>{product.subtitle}</p>
        </div>
        <div className="product-card-price">
          <strong>{money(price)}</strong>
          {product.compareAtPrice && product.compareAtPrice > price && (
            <s>{money(product.compareAtPrice)}</s>
          )}
        </div>
      </div>
      <div className="color-dots" aria-label={`${colors.length} renk seçeneği`}>
        {colors.map((variant) => (
          <span
            key={variant.colorId}
            style={{ background: variant.colorHex }}
            title={variant.color}
          />
        ))}
        <small>{colors.length} renk</small>
      </div>
    </article>
  );
}
