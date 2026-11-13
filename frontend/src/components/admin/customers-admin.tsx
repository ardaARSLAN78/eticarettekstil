"use client";

import { useState } from "react";
import { date, money, statusLabels } from "@/lib/format";
import type { CustomerAddress } from "@/lib/types";
import { Notice } from "../ui/notice";
import type { CustomerRow, Paged } from "./admin-types";
import { AdminSearch, Pagination } from "./admin-ui";
import { useAdminQuery } from "./use-admin-query";

interface CustomerDetail extends Omit<CustomerRow, "orders"> {
  addresses: CustomerAddress[];
  orders: {
    number: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

function CustomerCard({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error } = useAdminQuery<{ adminCustomer: CustomerDetail | null }>(
    "query($id:ID!){adminCustomer(id:$id)}",
    { id },
  );
  const customer = data?.adminCustomer;
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Müşteri ayrıntıları</h2>
        <button className="text-link" onClick={onClose}>
          Kapat
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {customer && (
        <>
          <h3>{customer.name}</h3>
          <p className="admin-description">
            {customer.email} · Kayıt: {date(customer.createdAt)}
          </p>
          <div className="admin-detail-grid">
            <div>
              <h3>Kayıtlı adresler</h3>
              {customer.addresses.length ? (
                customer.addresses.map((address) => (
                  <div className="customer-address" key={address.id}>
                    <strong>
                      {address.label}
                      {address.isDefault ? " · Varsayılan" : ""}
                    </strong>
                    <br />
                    {address.fullName}
                    <br />
                    {address.phone}
                    <br />
                    {address.address}
                    <br />
                    {address.district} / {address.city} {address.postalCode}
                  </div>
                ))
              ) : (
                <p className="admin-empty">Kayıtlı adres yok.</p>
              )}
            </div>
            <div>
              <h3>Son 50 sipariş</h3>
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr key={order.number}>
                        <td>
                          {order.number}
                          <small>{date(order.createdAt)}</small>
                        </td>
                        <td>{money(order.total)}</td>
                        <td>
                          {statusLabels[order.status]}
                          <small>{statusLabels[order.paymentStatus]}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!customer.orders.length && <p className="admin-empty">Henüz sipariş yok.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function CustomersAdmin() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const { data, error, loading } = useAdminQuery<{ adminCustomers: Paged<CustomerRow> }>(
    "query($filter:JSON){adminCustomers(filter:$filter)}",
    { filter: { search, page } },
  );
  const result = data?.adminCustomers;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">MÜŞTERİ İLİŞKİLERİ</span>
          <h1>Müşteriler</h1>
          <p>Kayıtlı hesaplar, adresler ve alışveriş geçmişi.</p>
        </div>
        <AdminSearch
          placeholder="Müşteri adı veya e-posta"
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>
      {error && <Notice>{error}</Notice>}
      {selected && <CustomerCard key={selected} id={selected} onClose={() => setSelected("")} />}
      <section className="admin-panel">
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Kayıt tarihi</th>
                <th>Sipariş</th>
                <th>Tahsil edilen</th>
                <th>Hesap</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    <small>{customer.email}</small>
                  </td>
                  <td>{date(customer.createdAt)}</td>
                  <td>{customer.orders}</td>
                  <td>{money(customer.totalSpent)}</td>
                  <td>
                    <span className={`status-pill ${customer.disabled ? "danger" : ""}`}>
                      {customer.disabled ? "Kapalı" : "Etkin"}
                    </span>
                  </td>
                  <td>
                    <button className="text-link" onClick={() => setSelected(customer.id)}>
                      Ayrıntılar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result?.items.length && (
          <p className="admin-empty">
            {loading ? "Müşteriler yükleniyor…" : "Eşleşen müşteri bulunamadı."}
          </p>
        )}
        {result && (
          <Pagination page={page} pages={result.pages} total={result.total} onPage={setPage} />
        )}
      </section>
    </>
  );
}
