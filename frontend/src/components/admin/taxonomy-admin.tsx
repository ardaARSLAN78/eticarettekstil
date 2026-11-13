"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { categoryFields, collectionFields } from "@/lib/queries";
import type { Brand, Category, Collection, Color, Size } from "@/lib/types";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { EntityForm, seoFields, type AdminField } from "./entity-form";
import { Notice } from "../ui/notice";

type Definitions = {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  brands: Brand[];
  collections: Collection[];
};
type DefinitionKey = keyof Definitions;
const query = `{categories{${categoryFields}} colors{id name slug hex sortOrder} sizes{id label code group sortOrder} brands{id name slug description logo} collections{${collectionFields}}}`;
const tabs: { key: DefinitionKey; label: string; mutation: string }[] = [
  { key: "categories", label: "Kategoriler", mutation: "saveCategory" },
  { key: "colors", label: "Renkler", mutation: "saveColor" },
  { key: "sizes", label: "Bedenler", mutation: "saveSize" },
  { key: "brands", label: "Markalar", mutation: "saveBrand" },
  { key: "collections", label: "Koleksiyonlar", mutation: "saveCollection" },
];

export function TaxonomyAdmin() {
  const { data, error, reload } = useAdminQuery<Definitions>(query);
  const [tab, setTab] = useState<DefinitionKey>("categories");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const notice = useAdminNotice();
  const common: AdminField[] = [
    { key: "name", label: "Ad" },
    { key: "slug", label: "Adres adı", hint: "Küçük harf ve tire kullanın." },
  ];
  let fields: AdminField[] = common;
  if (tab === "categories")
    fields = [
      ...common,
      { key: "description", label: "Açıklama", kind: "textarea", required: false },
      {
        key: "parentId",
        label: "Üst kategori",
        kind: "select",
        nullable: true,
        required: false,
        options: data?.categories
          .filter((item) => item.id !== editing?.id)
          .map((item) => ({ value: item.id, label: item.name })),
      },
      { key: "image", label: "Kategori görseli", kind: "image" },
      { key: "sortOrder", label: "Sıra", kind: "number" },
      { key: "active", label: "Mağazada görünür", kind: "checkbox" },
      ...seoFields,
    ];
  if (tab === "colors")
    fields = [
      ...common,
      { key: "hex", label: "Renk kodu", hint: "Örnek: #223d32" },
      { key: "sortOrder", label: "Sıra", kind: "number" },
    ];
  if (tab === "sizes")
    fields = [
      { key: "label", label: "Beden etiketi" },
      { key: "code", label: "Beden kodu", hint: "M, XL, 42 gibi" },
      {
        key: "group",
        label: "Beden grubu",
        kind: "select",
        options: [
          { value: "CLOTHING", label: "Giyim" },
          { value: "FOOTWEAR", label: "Ayakkabı" },
          { value: "ACCESSORY", label: "Aksesuar" },
        ],
      },
      { key: "sortOrder", label: "Sıra", kind: "number" },
    ];
  if (tab === "brands")
    fields = [
      ...common,
      { key: "description", label: "Açıklama", kind: "textarea", required: false },
      { key: "logo", label: "Marka logosu", kind: "image", nullable: true, required: false },
    ];
  if (tab === "collections")
    fields = [
      ...common,
      { key: "description", label: "Açıklama", kind: "textarea", required: false },
      { key: "image", label: "Koleksiyon görseli", kind: "image" },
      { key: "sortOrder", label: "Sıra", kind: "number" },
      { key: "active", label: "Mağazada görünür", kind: "checkbox" },
      ...seoFields,
    ];

  function edit(row?: object) {
    const source = row as Record<string, unknown> | undefined;
    const defaults: Record<string, unknown> = {
      name: "",
      label: "",
      code: "",
      slug: "",
      description: "",
      image: "/media/polo.png",
      logo: null,
      hex: "#223d32",
      group: "CLOTHING",
      sortOrder: 0,
      active: true,
      parentId: null,
      seoTitle: null,
      seoDescription: null,
      canonicalUrl: null,
      noIndex: false,
    };
    setEditing(
      Object.fromEntries(
        [...(source?.id ? ["id"] : []), ...fields.map((field) => field.key)].map((key) => [
          key,
          source?.[key] ?? defaults[key],
        ]),
      ),
    );
  }

  async function save(input: Record<string, unknown>) {
    const mutation = tabs.find((item) => item.key === tab)!.mutation;
    await api(`mutation($input:JSON!){${mutation}(input:$input){id}}`, { input });
    notice("Tanım kaydedildi.");
    setEditing(null);
    await reload();
  }
  const title = tabs.find((item) => item.key === tab)!.label;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">KATALOĞUN TEMELLERİ</span>
          <h1>Kategoriler & tanımlar</h1>
          <p>Renk, beden ve koleksiyonları bir kez tanımlayıp ürünlerde kullanın.</p>
        </div>
        <button className="button" disabled={!data} onClick={() => edit()}>
          <Plus size={16} /> Yeni tanım
        </button>
      </div>
      <div className="admin-tabs">
        {tabs.map((item) => (
          <button
            className={tab === item.key ? "selected" : ""}
            key={item.key}
            onClick={() => {
              setTab(item.key);
              setEditing(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <Notice>{error}</Notice>}
      {editing && (
        <section className="admin-panel">
          <h2>{editing.id ? "Tanımı düzenle" : `Yeni ${title.toLocaleLowerCase("tr")}`}</h2>
          <EntityForm
            key={`${tab}-${editing.id ?? "new"}`}
            fields={fields}
            initial={editing}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}
      <section className="admin-panel">
        <h2>{title}</h2>
        {!data ? (
          <p>Tanımlar hazırlanıyor…</p>
        ) : (
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ad / etiket</th>
                  <th>Adres / kod</th>
                  <th>Bilgi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data[tab].map((item) => {
                  const row = item as unknown as Record<string, unknown>;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{String(row.name ?? row.label)}</strong>
                      </td>
                      <td>{String(row.slug ?? row.code ?? "")}</td>
                      <td>
                        {row.hex ? (
                          <span className="color-definition">
                            <i style={{ background: String(row.hex) }} />
                            {String(row.hex)}
                          </span>
                        ) : row.group ? (
                          String(row.group)
                        ) : row.active === false ? (
                          "Pasif"
                        ) : (
                          "Aktif"
                        )}
                      </td>
                      <td>
                        <button className="text-link" onClick={() => edit(item)}>
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
