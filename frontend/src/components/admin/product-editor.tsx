"use client";
import { useState } from "react";
import type { Brand, Category, Collection, Color, Product, Size } from "@/lib/types";
import { api } from "@/lib/api";
import { EntityForm, seoFields, type AdminField } from "./entity-form";
import { GalleryEditor, type EditableImage } from "./gallery-editor";
import { VariantsEditor, type EditableVariant } from "./variants-editor";
import { useAdminNotice } from "./admin-context";

export interface CatalogDefinitions {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  brands: Brand[];
  collections: Collection[];
}

export function ProductEditor({
  product,
  definitions,
  onDone,
}: {
  product: Product | null;
  definitions: CatalogDefinitions;
  onDone: () => Promise<void>;
}) {
  const [tab, setTab] = useState("general");
  const [variants, setVariants] = useState<EditableVariant[]>(
    product?.variants.map((variant) => ({
      id: variant.id,
      expectedVersion: variant.version,
      colorId: variant.colorId,
      sizeId: variant.sizeId,
      sku: variant.sku,
      stock: variant.stock,
      price: variant.price,
      barcode: variant.barcode,
      active: variant.active,
      lowStockThreshold: variant.lowStockThreshold,
    })) ?? [],
  );
  const [images, setImages] = useState<EditableImage[]>(
    product?.media.map((image) => ({
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
      colorId: image.colorId,
    })) ?? [],
  );
  const notice = useAdminNotice();
  const initial: Record<string, unknown> = product
    ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        subtitle: product.subtitle,
        description: product.description,
        material: product.material,
        care: product.care,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        badge: product.badge,
        active: product.active,
        featured: product.featured,
        categoryId: product.categoryId,
        brandId: product.brandId,
        collectionIds: product.collections.map((item) => item.id),
        vatRateBps: product.vatRateBps,
        weightGrams: product.weightGrams,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        canonicalUrl: product.canonicalUrl,
        ogImage: product.ogImage,
        noIndex: product.noIndex,
      }
    : {
        name: "",
        slug: "",
        subtitle: "",
        description: "",
        material: "",
        care: "",
        price: 10000,
        compareAtPrice: null,
        badge: null,
        active: false,
        featured: false,
        categoryId: definitions.categories[0]?.id ?? "",
        brandId: definitions.brands[0]?.id ?? null,
        collectionIds: [],
        vatRateBps: 0,
        weightGrams: 0,
        seoTitle: null,
        seoDescription: null,
        canonicalUrl: null,
        ogImage: null,
        noIndex: false,
      };

  const general: AdminField[] = [
    { key: "name", label: "Ürün adı" },
    { key: "slug", label: "Ürün adresi", hint: "Küçük harf ve tire: riviera-polo" },
    { key: "subtitle", label: "Kısa bilgi", full: true, hint: "Örnek: %100 pamuk · Regular fit" },
    { key: "description", label: "Ürün açıklaması", kind: "textarea" },
    { key: "material", label: "Kumaş / malzeme", kind: "textarea" },
    { key: "care", label: "Bakım bilgileri", kind: "textarea" },
    { key: "price", label: "Satış fiyatı (TL)", kind: "money" },
    {
      key: "compareAtPrice",
      label: "Üzeri çizili eski fiyat (TL)",
      kind: "money",
      nullable: true,
      required: false,
    },
    {
      key: "categoryId",
      label: "Kategori",
      kind: "select",
      options: definitions.categories.map((item) => ({ value: item.id, label: item.name })),
    },
    {
      key: "brandId",
      label: "Marka",
      kind: "select",
      nullable: true,
      required: false,
      options: definitions.brands.map((item) => ({ value: item.id, label: item.name })),
    },
    {
      key: "vatRateBps",
      label: "Fiyata dahil KDV oranı (%)",
      kind: "percent",
      hint: "İşletmenizin geçerli oranını girin.",
    },
    { key: "weightGrams", label: "Ağırlık (gram)", kind: "number" },
    {
      key: "badge",
      label: "Ürün etiketi",
      required: false,
      nullable: true,
      hint: "Örnek: YENİ SEZON",
    },
    {
      key: "collectionIds",
      label: "Koleksiyonlar",
      kind: "multi",
      options: definitions.collections.map((item) => ({ value: item.id, label: item.name })),
    },
    { key: "active", label: "Mağazada yayında", kind: "checkbox" },
    { key: "featured", label: "Ana sayfada öne çıkar", kind: "checkbox" },
  ];

  async function save(values: Record<string, unknown>) {
    await api("mutation($input:JSON!){saveProduct(input:$input){id}}", {
      input: {
        ...values,
        images: images.map((image, index) => ({ ...image, sortOrder: index })),
        variants,
      },
    });
    notice("Ürün, varyantlar ve görseller kaydedildi.");
    await onDone();
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>{product ? product.name : "Yeni ürün"}</h2>
        <button type="button" className="text-link" onClick={() => void onDone()}>
          Listeye dön
        </button>
      </div>
      <div className="admin-tabs">
        {[
          { id: "general", label: "Ürün bilgileri" },
          { id: "variants", label: `Renk & beden (${variants.length})` },
          { id: "images", label: `Görseller (${images.length})` },
          { id: "seo", label: "SEO" },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? "selected" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <EntityForm
        fields={
          tab === "general"
            ? general
            : tab === "seo"
              ? [
                  ...seoFields,
                  {
                    key: "ogImage",
                    label: "Sosyal paylaşım görseli",
                    kind: "image",
                    nullable: true,
                    required: false,
                  },
                ]
              : []
        }
        initial={initial}
        onSave={save}
        onCancel={() => void onDone()}
      >
        {tab === "variants" && (
          <VariantsEditor
            colors={definitions.colors}
            sizes={definitions.sizes}
            variants={variants}
            onChange={setVariants}
          />
        )}
        {tab === "images" && (
          <GalleryEditor images={images} colors={definitions.colors} onChange={setImages} />
        )}
      </EntityForm>
    </section>
  );
}
