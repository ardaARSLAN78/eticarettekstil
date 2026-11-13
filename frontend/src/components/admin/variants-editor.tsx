"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Color, Size } from "@/lib/types";

export interface EditableVariant {
  id?: string;
  expectedVersion?: number;
  colorId: string;
  sizeId: string;
  sku: string;
  stock: number;
  active: boolean;
  barcode?: string | null;
  price?: number | null;
  lowStockThreshold?: number;
}

export function VariantsEditor({
  colors,
  sizes,
  variants,
  onChange,
}: {
  colors: Color[];
  sizes: Size[];
  variants: EditableVariant[];
  onChange: (variants: EditableVariant[]) => void;
}) {
  const [selectedColors, setColors] = useState<string[]>([]);
  const [selectedSizes, setSizes] = useState<string[]>([]);
  const [group, setGroup] = useState("CLOTHING");
  function update(index: number, patch: Partial<EditableVariant>) {
    onChange(
      variants.map((variant, position) =>
        position === index ? { ...variant, ...patch } : variant,
      ),
    );
  }
  function toggle(set: string[], value: string) {
    return set.includes(value) ? set.filter((item) => item !== value) : [...set, value];
  }
  function generate() {
    const next = [...variants];
    for (const colorId of selectedColors)
      for (const sizeId of selectedSizes) {
        if (next.some((variant) => variant.colorId === colorId && variant.sizeId === sizeId))
          continue;
        if (next.length >= 120) break;
        next.push({
          colorId,
          sizeId,
          sku: `Q-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${sizes.find((size) => size.id === sizeId)?.code ?? ""}`,
          stock: 0,
          active: true,
          price: null,
          barcode: null,
          lowStockThreshold: 3,
        });
      }
    onChange(next);
  }

  return (
    <div className="variants-editor">
      <div className="variant-generator">
        <h3>Renk / beden matrisi</h3>
        <p>Seçimlerden eksik varyantlar oluşturulur. Mevcut SKU ve stoklar korunur.</p>
        <div className="admin-chip-options">
          {colors.map((color) => (
            <label key={color.id}>
              <input
                type="checkbox"
                checked={selectedColors.includes(color.id)}
                onChange={() => setColors(toggle(selectedColors, color.id))}
              />
              <i style={{ background: color.hex }} />
              {color.name}
            </label>
          ))}
        </div>
        <select
          aria-label="Beden grubu"
          value={group}
          onChange={(event) => {
            setGroup(event.target.value);
            setSizes([]);
          }}
        >
          <option value="CLOTHING">Giyim bedenleri</option>
          <option value="FOOTWEAR">Ayakkabı numaraları</option>
          <option value="ACCESSORY">Aksesuar ölçüleri</option>
        </select>
        <div className="admin-chip-options">
          {sizes
            .filter((size) => size.group === group)
            .map((size) => (
              <label key={size.id}>
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size.id)}
                  onChange={() => setSizes(toggle(selectedSizes, size.id))}
                />
                {size.label}
              </label>
            ))}
        </div>
        <button
          className="button button-outline"
          type="button"
          disabled={!selectedColors.length || !selectedSizes.length}
          onClick={generate}
        >
          <Plus size={15} /> Varyantları ekle
        </button>
      </div>
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Renk</th>
              <th>Beden</th>
              <th>SKU</th>
              <th>Stok</th>
              <th>Özel fiyat (TL)</th>
              <th>Barkod</th>
              <th>Uyarı eşiği</th>
              <th>Aktif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, index) => (
              <tr key={variant.id ?? `${variant.colorId}-${variant.sizeId}-${index}`}>
                <td>
                  <select
                    aria-label={`${index + 1}. varyant rengi`}
                    value={variant.colorId}
                    onChange={(event) => update(index, { colorId: event.target.value })}
                  >
                    {colors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`${index + 1}. varyant bedeni`}
                    value={variant.sizeId}
                    onChange={(event) => update(index, { sizeId: event.target.value })}
                  >
                    {sizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.code} ·{" "}
                        {size.group === "FOOTWEAR"
                          ? "EU"
                          : size.group === "CLOTHING"
                            ? "Giyim"
                            : "Aksesuar"}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="sku-input"
                    aria-label={`${index + 1}. SKU`}
                    value={variant.sku}
                    onChange={(event) => update(index, { sku: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="small-input"
                    aria-label={`${index + 1}. stok`}
                    type="number"
                    min={0}
                    value={variant.stock}
                    onChange={(event) => update(index, { stock: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="price-input"
                    aria-label={`${index + 1}. varyant fiyatı`}
                    placeholder="Ürün fiyatı"
                    type="number"
                    min={1}
                    step=".01"
                    value={variant.price == null ? "" : variant.price / 100}
                    onChange={(event) =>
                      update(index, {
                        price: event.target.value
                          ? Math.round(Number(event.target.value) * 100)
                          : null,
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className="price-input"
                    aria-label={`${index + 1}. barkod`}
                    value={variant.barcode ?? ""}
                    onChange={(event) => update(index, { barcode: event.target.value || null })}
                  />
                </td>
                <td>
                  <input
                    className="small-input"
                    aria-label={`${index + 1}. stok uyarı eşiği`}
                    type="number"
                    min={0}
                    value={variant.lowStockThreshold ?? 3}
                    onChange={(event) =>
                      update(index, { lowStockThreshold: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${index + 1}. varyant aktif`}
                    checked={variant.active}
                    onChange={(event) => update(index, { active: event.target.checked })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${index + 1}. varyantı kaldır`}
                    onClick={() => onChange(variants.filter((_, position) => position !== index))}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!variants.length && (
        <p className="admin-empty">Satış için en az bir renk / beden varyantı oluşturun.</p>
      )}
    </div>
  );
}
