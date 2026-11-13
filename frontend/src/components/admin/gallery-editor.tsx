"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Color } from "@/lib/types";
import { ImageField } from "./entity-form";

export interface EditableImage {
  url: string;
  alt: string;
  sortOrder: number;
  colorId: string | null;
}

export function GalleryEditor({
  images,
  colors,
  onChange,
}: {
  images: EditableImage[];
  colors: Color[];
  onChange: (images: EditableImage[]) => void;
}) {
  function update(index: number, patch: Partial<EditableImage>) {
    onChange(
      images.map((image, position) => (position === index ? { ...image, ...patch } : image)),
    );
  }
  function move(index: number, direction: number) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }
  return (
    <div className="gallery-editor">
      <p>
        İlk görsel kapak olarak kullanılır. Renk seçerseniz görsel o varyantın galerisinde
        gösterilir.
      </p>
      {images.map((image, index) => (
        <article className="admin-image-card" key={index}>
          <div className="admin-panel-heading">
            <h3>
              Görsel {index + 1}
              {index === 0 ? " · Kapak" : ""}
            </h3>
            <div>
              <button
                type="button"
                className="icon-button"
                aria-label="Görseli öne al"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Görseli arkaya al"
                disabled={index === images.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Görseli kaldır"
                onClick={() => onChange(images.filter((_, position) => position !== index))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <ImageField
            label="Görsel adresi"
            value={image.url}
            onChange={(url) => update(index, { url })}
          />
          <div className="form-grid">
            <label className="field">
              <span>Alternatif metin</span>
              <input
                value={image.alt}
                maxLength={200}
                onChange={(event) => update(index, { alt: event.target.value })}
              />
            </label>
            <label className="field">
              <span>İlgili renk</span>
              <select
                value={image.colorId ?? ""}
                onChange={(event) => update(index, { colorId: event.target.value || null })}
              >
                <option value="">Tüm renkler</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>
      ))}
      <button
        type="button"
        className="button button-outline"
        disabled={images.length >= 10}
        onClick={() =>
          onChange([...images, { url: "", alt: "", sortOrder: images.length, colorId: null }])
        }
      >
        <Plus size={15} /> Görsel ekle
      </button>
    </div>
  );
}
