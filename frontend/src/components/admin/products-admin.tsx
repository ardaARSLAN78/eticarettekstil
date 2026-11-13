"use client";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { categoryFields, collectionFields, productFields } from "@/lib/queries";
import type { Product, ProductPage } from "@/lib/types";
import { errorMessage, money } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { ProductEditor, type CatalogDefinitions } from "./product-editor";
import { Notice } from "../ui/notice";

const query = `query($filter:ProductFilter){adminProducts(filter:$filter){total page pages items{${productFields}}} categories{${categoryFields}} colors{id name slug hex sortOrder} sizes{id label code group sortOrder} brands{id name slug description logo} collections{${collectionFields}}}`;

export function ProductsAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, error, reload } = useAdminQuery<
    CatalogDefinitions & { adminProducts: ProductPage }
  >(query, { filter: { limit: 24, page, search, sort: "NEWEST" } });
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [operationError, setError] = useState("");
  const notice = useAdminNotice();

  async function archive(id: string) {
    try {
      await api("mutation($id:ID!){archiveProduct(id:$id)}", { id });
      notice("Ürün yayından kaldırıldı; sipariş geçmişi korundu.");
      await reload();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(String(new FormData(event.currentTarget).get("search") ?? ""));
    setPage(1);
  }

  if (editing !== undefined && data)
    return (
      <ProductEditor
        key={editing?.id ?? "new"}
        product={editing}
        definitions={data}
        onDone={async () => {
          setEditing(undefined);
          await reload();
        }}
      />
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">KATALOĞUNUZ</span>
          <h1>Ürünler</h1>
          <p>Ürün, varyant, stok, görsel ve SEO bilgileri.</p>
        </div>
        <button className="button" disabled={!data} onClick={() => setEditing(null)}>
          <Plus size={16} /> Yeni ürün
        </button>
      </div>
      {(error || operationError) && <Notice>{error || operationError}</Notice>}
      <section className="admin-panel">
        <form className="admin-search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            name="search"
            placeholder="Ürünlerde ara…"
            aria-label="Yönetim ürün arama"
            maxLength={80}
          />
          <button type="submit">Ara</button>
        </form>
        {!data ? (
          <p className="admin-empty">Katalog hazırlanıyor…</p>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Kategori</th>
                    <th>Fiyat</th>
                    <th>Varyant / stok</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.adminProducts.items.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          <img src={product.images[0]} alt="" />
                          <span>
                            <strong>{product.name}</strong>
                            <small>/{product.slug}</small>
                          </span>
                        </div>
                      </td>
                      <td>{product.category.name}</td>
                      <td>{money(product.price)}</td>
                      <td>
                        {product.variants.filter((v) => v.active).length} varyant
                        <small>
                          {product.variants
                            .filter((v) => v.active)
                            .reduce((sum, v) => sum + v.stock, 0)}{" "}
                          adet
                        </small>
                      </td>
                      <td>
                        <span className={`status-pill ${product.active ? "" : "muted-pill"}`}>
                          {product.active ? "Yayında" : "Taslak / pasif"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button onClick={() => setEditing(product)}>Düzenle</button>
                          {product.active && (
                            <button onClick={() => void archive(product.id)}>
                              Yayından kaldır
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <span>
                {data.adminProducts.total} ürün · Sayfa {page} / {data.adminProducts.pages}
              </span>
              <button
                className="icon-button"
                disabled={page <= 1}
                aria-label="Önceki ürün sayfası"
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="icon-button"
                disabled={page >= data.adminProducts.pages}
                aria-label="Sonraki ürün sayfası"
                onClick={() => setPage(page + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
