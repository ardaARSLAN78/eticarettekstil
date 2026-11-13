"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { Notice } from "../ui/notice";
import { useAdminNotice } from "./admin-context";
import type { InventoryRow, Paged, Warehouse } from "./admin-types";
import { AdminSearch, Pagination } from "./admin-ui";
import { EntityForm } from "./entity-form";
import { useAdminQuery } from "./use-admin-query";

interface Movement {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  warehouseId: string;
  createdAt: string;
}
const reasonLabels: Record<string, string> = {
  ADJUSTMENT: "Stok düzenleme",
  RESERVATION: "Sipariş rezervasyonu",
  RELEASE: "Rezervasyon iadesi",
  SALE: "Satış",
};

function StockEditor({
  item,
  warehouses,
  onDone,
  onClose,
}: {
  item: InventoryRow;
  warehouses: Warehouse[];
  onDone: () => Promise<void>;
  onClose: () => void;
}) {
  const notice = useAdminNotice();
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAdminQuery<{ inventoryMovements: Movement[] }>(
    "query($id:ID!,$page:Int){inventoryMovements(variantId:$id,page:$page)}",
    { id: item.id, page },
  );
  async function save(values: Record<string, unknown>) {
    await api("mutation($input:JSON!){updateInventory(input:$input)}", {
      input: {
        variantId: item.id,
        stock: values.stock,
        warehouseId: values.warehouseId,
        expectedVersion: item.version,
        note: values.note,
      },
    });
    notice("Stok kaydı ve hareket geçmişi güncellendi.");
    await onDone();
    await reload();
    onClose();
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>
          {item.name} · {item.color} / {item.size}
        </h2>
        <button className="text-link" onClick={onClose}>
          Kapat
        </button>
      </div>
      <p className="admin-description">
        {item.sku} · Açık sipariş varsa depo değiştirilemez. Stok, satışa ayrılmamış mevcut adedi
        gösterir.
      </p>
      <EntityForm
        key={`${item.id}-${item.version}`}
        initial={{ stock: item.stock, warehouseId: item.warehouseId, note: "" }}
        onSave={save}
        onCancel={onClose}
        fields={[
          { key: "stock", label: "Mevcut stok", kind: "number" },
          {
            key: "warehouseId",
            label: "Depo",
            kind: "select",
            options: warehouses
              .filter((w) => w.active)
              .map((w) => ({ value: w.id, label: w.name })),
          },
          {
            key: "note",
            label: "İşlem açıklaması",
            kind: "textarea",
            hint: "En az 4 karakter; stok hareket geçmişinde saklanır.",
          },
        ]}
      />
      <div className="admin-subform">
        <h3>Stok hareketleri</h3>
        {error && <Notice>{error}</Notice>}
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>İşlem</th>
                <th>Adet farkı</th>
                <th>Depo</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {data?.inventoryMovements.map((row) => (
                <tr key={row.id}>
                  <td>{date(row.createdAt)}</td>
                  <td>{reasonLabels[row.reason] ?? row.reason}</td>
                  <td>
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </td>
                  <td>
                    {warehouses.find((w) => w.id === row.warehouseId)?.name ?? row.warehouseId}
                  </td>
                  <td>{row.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Önceki
          </button>
          <span>Sayfa {page}</span>
          <button
            disabled={(data?.inventoryMovements.length ?? 0) < 50}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </button>
        </div>
      </div>
    </section>
  );
}

export function InventoryAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [warehouse, setWarehouse] = useState<Partial<Warehouse> | null>(null);
  const notice = useAdminNotice();
  const { data, error, loading, reload } = useAdminQuery<{
    adminInventory: Paged<InventoryRow>;
    adminWarehouses: Warehouse[];
  }>("query($filter:JSON){adminInventory(filter:$filter) adminWarehouses}", {
    filter: { page, search, lowOnly, ...(warehouseId ? { warehouseId } : {}) },
  });
  const result = data?.adminInventory;
  const warehouses = data?.adminWarehouses ?? [];
  async function saveWarehouse(values: Record<string, unknown>) {
    const input = Object.fromEntries(
      ["id", "name", "code", "address", "active"]
        .filter((key) => values[key] !== undefined)
        .map((key) => [key, values[key]]),
    );
    await api("mutation($input:JSON!){saveWarehouse(input:$input)}", { input });
    notice("Depo kaydedildi.");
    setWarehouse(null);
    await reload();
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ENVANTER</span>
          <h1>Stok & depo</h1>
          <p>Her renk ve beden için stok, depo ve kayıtlı hareket geçmişi.</p>
        </div>
        <button
          className="button"
          onClick={() => setWarehouse({ name: "", code: "", address: "", active: true })}
        >
          Yeni depo
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {warehouse && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Depo bilgileri</h2>
          </div>
          <EntityForm
            key={warehouse.id ?? "new"}
            initial={warehouse}
            onSave={saveWarehouse}
            onCancel={() => setWarehouse(null)}
            fields={[
              { key: "name", label: "Depo adı" },
              { key: "code", label: "Depo kodu", hint: "Büyük harf, rakam, tire veya alt çizgi" },
              { key: "address", label: "Depo adresi", kind: "textarea", required: false },
              { key: "active", label: "Depo etkin", kind: "checkbox" },
            ]}
          />
        </section>
      )}
      {selected && (
        <StockEditor
          key={selected.id}
          item={selected}
          warehouses={warehouses}
          onDone={reload}
          onClose={() => setSelected(null)}
        />
      )}
      <section className="admin-panel">
        <div className="admin-filter-bar">
          <AdminSearch
            placeholder="Ürün veya SKU ara"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <select
            className="admin-filter"
            aria-label="Depoya göre filtrele"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm depolar</option>
            {warehouses.map((w) => (
              <option value={w.id} key={w.id}>
                {w.name}
                {w.active ? "" : " (pasif)"}
              </option>
            ))}
          </select>
          <label className="check-label">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(event) => {
                setLowOnly(event.target.checked);
                setPage(1);
              }}
            />
            Azalan stoklar
          </label>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ürün / SKU</th>
                <th>Renk / beden</th>
                <th>Depo</th>
                <th>Mevcut stok</th>
                <th>Eşik</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sku}
                      {item.active ? "" : " · Pasif"}
                    </small>
                  </td>
                  <td>
                    {item.color} / {item.size}
                  </td>
                  <td>{item.warehouse}</td>
                  <td>
                    <span
                      className={`status-pill ${item.stock <= item.lowStockThreshold ? "warning" : ""}`}
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td>{item.lowStockThreshold}</td>
                  <td>
                    <button className="text-link" onClick={() => setSelected(item)}>
                      Stok & geçmiş
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result?.items.length && (
          <p className="admin-empty">
            {loading ? "Stoklar yükleniyor…" : "Bu filtreye uygun kayıt bulunamadı."}
          </p>
        )}
        {result && (
          <Pagination page={page} pages={result.pages} total={result.total} onPage={setPage} />
        )}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Depolar</h2>
          <span>Bir varyantın mevcut stoğu tek depoda tutulur.</span>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Depo</th>
                <th>Kod</th>
                <th>Adres</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td>{w.code}</td>
                  <td>{w.address || "—"}</td>
                  <td>{w.active ? "Etkin" : "Pasif"}</td>
                  <td>
                    <button className="text-link" onClick={() => setWarehouse(w)}>
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
