import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getBootstrap, serverApi } from "@/lib/server-api";
import { productFields, productsQuery } from "@/lib/queries";
import type { Product, ProductPage } from "@/lib/types";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductCard } from "@/components/store/product-card";

const getProduct = cache((slug: string) =>
  serverApi<{ product: Product | null }>(
    `query($slug:String!){product(slug:$slug){${productFields}}}`,
    { slug },
  ),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { product } = await getProduct((await params).slug);
  if (!product) return { title: "Ürün bulunamadı", robots: { index: false } };
  const { settings } = await getBootstrap();
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description.slice(0, 160),
    alternates: { canonical: product.canonicalUrl ?? `/urun/${product.slug}` },
    robots: { index: settings.allowIndexing && !product.noIndex, follow: settings.allowIndexing },
    openGraph: { title: product.name, description: product.subtitle, images: product.images },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  if (!product) {
    const data = await serverApi<{ resolveRedirect: string | null }>(
      "query($path:String!){resolveRedirect(path:$path)}",
      { path: `/urun/${slug}` },
    );
    if (data.resolveRedirect) permanentRedirect(data.resolveRedirect);
    notFound();
  }
  const [{ settings }, { products }] = await Promise.all([
    getBootstrap(),
    serverApi<{ products: ProductPage }>(productsQuery, {
      filter: { limit: 4, category: product.category.slug },
    }),
  ]);
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const prices = product.variants
    .filter((variant) => variant.active)
    .map((variant) => variant.price ?? product.price);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) => new URL(image, origin).href),
    brand: { "@type": "Brand", name: settings.brandName },
    offers: {
      "@type": "AggregateOffer",
      url: `${origin}/urun/${product.slug}`,
      priceCurrency: "TRY",
      lowPrice: ((prices.length ? Math.min(...prices) : product.price) / 100).toFixed(2),
      highPrice: ((prices.length ? Math.max(...prices) : product.price) / 100).toFixed(2),
      offerCount: prices.length,
      availability: product.variants.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      <div className="page-container">
        <ProductDetail product={product} />
        {products.items.some((item) => item.id !== product.id) && (
          <section className="related-products">
            <div className="section-heading">
              <div>
                <span className="eyebrow">BİRLİKTE, DAHA İYİ</span>
                <h2>Stilinizi tamamlayın.</h2>
              </div>
            </div>
            <div className="product-grid">
              {products.items
                .filter((item) => item.id !== product.id)
                .slice(0, 4)
                .map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
