import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, SlidersHorizontal } from "lucide-react";
import { getBootstrap, serverApi } from "@/lib/server-api";
import { productsQuery } from "@/lib/queries";
import type { ProductPage } from "@/lib/types";
import { ProductCard } from "@/components/store/product-card";

type Search = {
  kategori?: string;
  secim?: string;
  arama?: string;
  siralama?: string;
  sayfa?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const params = await searchParams;
  const { categories, collections, settings } = await getBootstrap();
  const item =
    categories.find((category) => category.slug === params.kategori) ??
    collections.find((collection) => collection.slug === params.secim);
  return {
    title: item?.seoTitle ?? item?.name ?? "Koleksiyon",
    description: item?.seoDescription ?? "Quantia klasik erkek giyim koleksiyonunu keşfedin.",
    robots: {
      index: settings.allowIndexing && !params.arama && !item?.noIndex,
      follow: settings.allowIndexing,
    },
    alternates: {
      canonical:
        item?.canonicalUrl ??
        `/koleksiyon${params.kategori ? `?kategori=${params.kategori}` : params.secim ? `?secim=${params.secim}` : ""}`,
    },
  };
}

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { categories, collections } = await getBootstrap();
  const category = categories.find((category) => category.slug === params.kategori);
  const collection = collections.find((collection) => collection.slug === params.secim);
  const sort = ["NEWEST", "PRICE_ASC", "PRICE_DESC", "FEATURED"].includes(params.siralama ?? "")
    ? params.siralama
    : "FEATURED";
  const page = Math.max(1, Math.min(1000, Number(params.sayfa) || 1));
  const { products } = await serverApi<{ products: ProductPage }>(productsQuery, {
    filter: {
      ...(category ? { category: category.slug } : {}),
      ...(collection ? { collection: collection.slug } : {}),
      ...(params.arama ? { search: params.arama.slice(0, 80) } : {}),
      sort,
      page,
      limit: 12,
    },
  });
  function pageLink(target: number) {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    query.set("sayfa", String(target));
    return `/koleksiyon?${query}`;
  }

  return (
    <div className="collection-page page-container">
      <div className="collection-intro">
        <span className="eyebrow">QUANTIA KOLEKSİYONU</span>
        <h1>
          {params.arama
            ? `“${params.arama.slice(0, 80)}” için seçkiler`
            : (category?.name ?? collection?.name ?? "Zamana meydan okuyan parçalar.")}
        </h1>
        <p>
          {category?.description ||
            collection?.description ||
            "Doğal dokular, dengeli kesimler ve size ait bir stil."}
        </p>
      </div>
      <div className="collection-toolbar">
        <nav className="category-tabs" aria-label="Ürün kategorileri">
          <Link href="/koleksiyon" className={!category ? "selected" : ""}>
            Tüm parçalar
          </Link>
          {categories.map((item) => (
            <Link
              className={category?.id === item.id ? "selected" : ""}
              href={`/koleksiyon?kategori=${item.slug}`}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <form className="sort-form">
          <input type="hidden" name="kategori" value={params.kategori ?? ""} />
          <input type="hidden" name="secim" value={params.secim ?? ""} />
          <input type="hidden" name="arama" value={params.arama ?? ""} />
          <SlidersHorizontal size={15} />
          <select name="siralama" defaultValue={sort} aria-label="Ürün sıralaması">
            <option value="FEATURED">Öne çıkanlar</option>
            <option value="NEWEST">En yeniler</option>
            <option value="PRICE_ASC">Artan fiyat</option>
            <option value="PRICE_DESC">Azalan fiyat</option>
          </select>
          <button type="submit">Uygula</button>
        </form>
      </div>
      <p className="product-count">{products.total} parça</p>
      {products.items.length ? (
        <div className="product-grid">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Bu seçkide henüz bir parça yok.</h2>
          <p>Başka bir kategoriye göz atabilir ya da aramanızı değiştirebilirsiniz.</p>
          <Link className="text-link" href="/koleksiyon">
            Tüm koleksiyon <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {products.pages > 1 && (
        <nav className="pagination" aria-label="Koleksiyon sayfaları">
          {products.page > 1 && (
            <Link href={pageLink(products.page - 1)}>
              <ArrowLeft size={16} /> Önceki
            </Link>
          )}
          <span>
            {products.page} / {products.pages}
          </span>
          {products.page < products.pages && (
            <Link href={pageLink(products.page + 1)}>
              Sonraki <ArrowRight size={16} />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
