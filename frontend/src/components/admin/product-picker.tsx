"use client";
import { useState } from "react";
import { useAdminQuery } from "./use-admin-query";

export function ProductPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error } = useAdminQuery<{
    adminProducts: { pages: number; items: { id: string; name: string }[] };
  }>("query($filter:ProductFilter){adminProducts(filter:$filter){pages items{id name}}}", {
    filter: { search, page, limit: 12 },
  });
  return (
    <fieldset className="product-picker">
      <legend>Kapsamdaki ürünler</legend>
      <input
        placeholder="Ürün adıyla ara…"
        aria-label="Kampanya için ürün ara"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <small>
        {selected.length} ürün seçili. Ürün ve kategori seçilmezse tüm ürünler kapsanır.
      </small>
      <div className="admin-chip-options">
        {data?.adminProducts.items.map((product) => (
          <label key={product.id}>
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, product.id]
                    : selected.filter((id) => id !== product.id),
                )
              }
            />
            {product.name}
          </label>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="admin-pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Önceki
        </button>
        <span>
          {page} / {data?.adminProducts.pages ?? 1}
        </span>
        <button
          type="button"
          disabled={page >= (data?.adminProducts.pages ?? 1)}
          onClick={() => setPage(page + 1)}
        >
          Sonraki
        </button>
        <button type="button" disabled={!selected.length} onClick={() => onChange([])}>
          Seçimi temizle
        </button>
      </div>
    </fieldset>
  );
}
