"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Campaign, Category, Coupon } from "@/lib/types";
import { date, money } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { EntityForm, type AdminField } from "./entity-form";
import { ProductPicker } from "./product-picker";
import { Notice } from "../ui/notice";

const query =
  "{adminCampaigns{id name slug description type value active automatic startsAt endsAt minimumSubtotal maximumDiscount usageLimit perEmailLimit products{id name} categories{id name} coupons{id code campaignId active usageLimit}} categories{id name}}";

export function CampaignsAdmin() {
  const { data, error, reload } = useAdminQuery<{
    adminCampaigns: Campaign[];
    categories: Category[];
  }>(query);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [coupon, setCoupon] = useState<Record<string, unknown> | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const notice = useAdminNotice();
  const fields: AdminField[] = [
    { key: "name", label: "Kampanya adı" },
    { key: "slug", label: "Kampanya adres adı" },
    { key: "description", label: "Açıklama", kind: "textarea", required: false },
    {
      key: "type",
      label: "İndirim türü",
      kind: "select",
      options: [
        { value: "PERCENTAGE", label: "Yüzde indirim" },
        { value: "FIXED_AMOUNT", label: "Sabit tutar" },
      ],
    },
    {
      key: "value",
      label: "İndirim değeri (% veya TL)",
      kind: "money",
      hint: "Yüzde türünde 10 = %10; sabit tutarda 10 = 10 TL.",
    },
    { key: "startsAt", label: "Başlangıç", kind: "date" },
    { key: "endsAt", label: "Bitiş", kind: "date" },
    { key: "minimumSubtotal", label: "Minimum sepet (TL)", kind: "money" },
    {
      key: "maximumDiscount",
      label: "En yüksek indirim (TL)",
      kind: "money",
      nullable: true,
      required: false,
    },
    {
      key: "usageLimit",
      label: "Toplam kullanım sınırı",
      kind: "number",
      nullable: true,
      required: false,
    },
    {
      key: "perEmailLimit",
      label: "E-posta başına sınır",
      kind: "number",
      nullable: true,
      required: false,
    },
    {
      key: "categoryIds",
      label: "Kapsamdaki kategoriler",
      kind: "multi",
      options: data?.categories.map((item) => ({ value: item.id, label: item.name })),
      hint: "Seçilen kategorinin alt kategorileri de kapsanır.",
    },
    { key: "automatic", label: "Kuponsuz otomatik uygula", kind: "checkbox" },
    { key: "active", label: "Kampanya aktif", kind: "checkbox" },
  ];
  function edit(campaign?: Campaign) {
    setCoupon(null);
    setProductIds(campaign?.products.map((product) => product.id) ?? []);
    setEditing(
      campaign
        ? {
            id: campaign.id,
            name: campaign.name,
            slug: campaign.slug,
            description: campaign.description,
            type: campaign.type,
            value: campaign.value,
            active: campaign.active,
            automatic: campaign.automatic,
            startsAt: campaign.startsAt,
            endsAt: campaign.endsAt,
            minimumSubtotal: campaign.minimumSubtotal,
            maximumDiscount: campaign.maximumDiscount,
            usageLimit: campaign.usageLimit,
            perEmailLimit: campaign.perEmailLimit,
            categoryIds: campaign.categories.map((category) => category.id),
          }
        : {
            name: "",
            slug: "",
            description: "",
            type: "PERCENTAGE",
            value: 1000,
            active: false,
            automatic: false,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
            minimumSubtotal: 0,
            maximumDiscount: null,
            usageLimit: null,
            perEmailLimit: null,
            categoryIds: [],
          },
    );
  }
  async function save(input: Record<string, unknown>) {
    await api("mutation($input:JSON!){saveCampaign(input:$input){id}}", {
      input: { ...input, productIds },
    });
    setEditing(null);
    notice("Kampanya kuralları kaydedildi.");
    await reload();
  }
  async function saveCoupon(input: Record<string, unknown>) {
    await api("mutation($input:JSON!){saveCoupon(input:$input){id}}", { input });
    setCoupon(null);
    notice("Kupon kaydedildi.");
    await reload();
  }
  function editCoupon(row?: Coupon) {
    setEditing(null);
    setCoupon(
      row
        ? { ...row }
        : {
            code: "",
            campaignId: data?.adminCampaigns[0]?.id ?? "",
            active: true,
            usageLimit: null,
          },
    );
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">SATIŞ KURALLARI</span>
          <h1>Kampanyalar & kuponlar</h1>
          <p>Tarih, kapsam ve kullanım sınırı sunucuda uygulanır.</p>
        </div>
        <div className="admin-heading-actions">
          <button
            className="button button-outline"
            disabled={!data?.adminCampaigns.length}
            onClick={() => editCoupon()}
          >
            Yeni kupon
          </button>
          <button className="button" onClick={() => edit()}>
            <Plus size={15} /> Yeni kampanya
          </button>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {editing && (
        <section className="admin-panel">
          <h2>Kampanya kuralları</h2>
          <EntityForm
            key={String(editing.id ?? "new")}
            fields={fields}
            initial={editing}
            onSave={save}
            onCancel={() => setEditing(null)}
          >
            <ProductPicker selected={productIds} onChange={setProductIds} />
          </EntityForm>
        </section>
      )}
      {coupon && (
        <section className="admin-panel">
          <h2>Kupon</h2>
          <EntityForm
            key={String(coupon.id ?? "new")}
            initial={coupon}
            onSave={saveCoupon}
            onCancel={() => setCoupon(null)}
            fields={[
              { key: "code", label: "Kupon kodu" },
              {
                key: "campaignId",
                label: "Kampanya",
                kind: "select",
                options: data?.adminCampaigns.map((item) => ({ value: item.id, label: item.name })),
              },
              {
                key: "usageLimit",
                label: "Kupon kullanım sınırı",
                kind: "number",
                nullable: true,
                required: false,
              },
              { key: "active", label: "Kupon aktif", kind: "checkbox" },
            ]}
          />
        </section>
      )}
      <section className="admin-panel">
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kampanya</th>
                <th>İndirim</th>
                <th>Dönem</th>
                <th>Kuponlar</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.adminCampaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <strong>{campaign.name}</strong>
                    <small>
                      {campaign.automatic ? "Otomatik" : "Kupon ile"} · Minimum{" "}
                      {money(campaign.minimumSubtotal)}
                    </small>
                  </td>
                  <td>
                    {campaign.type === "PERCENTAGE"
                      ? `%${campaign.value / 100}`
                      : money(campaign.value)}
                  </td>
                  <td>
                    {date(campaign.startsAt)}
                    <small>{date(campaign.endsAt)}</small>
                  </td>
                  <td>
                    {campaign.coupons.map((item) => (
                      <button className="coupon-tag" key={item.id} onClick={() => editCoupon(item)}>
                        {item.code}
                        {!item.active ? " · Pasif" : ""}
                      </button>
                    ))}
                  </td>
                  <td>
                    <span className={`status-pill ${campaign.active ? "" : "muted-pill"}`}>
                      {campaign.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td>
                    <button className="text-link" onClick={() => edit(campaign)}>
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
