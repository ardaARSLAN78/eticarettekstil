"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { EntityForm } from "./entity-form";
import { Notice } from "../ui/notice";

export function SeoAdmin() {
  const { data, error, reload } = useAdminQuery<{
    adminRedirects: { id: string; fromPath: string; toPath: string }[];
  }>("{adminRedirects{id fromPath toPath}}");
  const notice = useAdminNotice();
  async function save(input: Record<string, unknown>) {
    await api("mutation($input:JSON!){saveRedirect(input:$input){id}}", { input });
    notice("Kalıcı yönlendirme kaydedildi.");
    await reload();
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ARAMA GÖRÜNÜRLÜĞÜ</span>
          <h1>SEO & yönlendirmeler</h1>
          <p>Ürün ve kategori SEO alanları kendi düzenleme ekranlarındadır.</p>
        </div>
      </div>
      <div className="admin-info-box">
        <p>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
            Site haritası
          </a>{" "}
          ve{" "}
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
            robots.txt
          </a>{" "}
          mağaza verilerinden üretilir. Genel indeksleme anahtarı içerik ayarlarındadır. Ürün adresi
          değiştiğinde eski adres için yönlendirme otomatik kaydedilir.
        </p>
      </div>
      {error && <Notice>{error}</Notice>}
      <section className="admin-panel">
        <h2>Yeni kalıcı yönlendirme</h2>
        <EntityForm
          initial={{ fromPath: "", toPath: "" }}
          fields={[
            { key: "fromPath", label: "Eski site içi adres", hint: "/urun/eski-urun" },
            { key: "toPath", label: "Yeni site içi adres", hint: "/urun/yeni-urun" },
          ]}
          onSave={save}
        />
      </section>
      <section className="admin-panel">
        <h2>Kayıtlı yönlendirmeler</h2>
        <table>
          <thead>
            <tr>
              <th>Eski adres</th>
              <th>Hedef adres</th>
              <th>Tür</th>
            </tr>
          </thead>
          <tbody>
            {data?.adminRedirects.map((row) => (
              <tr key={row.id}>
                <td>{row.fromPath}</td>
                <td>{row.toPath}</td>
                <td>Kalıcı</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.adminRedirects.length === 0 && (
          <p className="admin-empty">Henüz bir yönlendirme kaydı yok.</p>
        )}
      </section>
    </>
  );
}

interface AuditRow {
  id: string;
  action: string;
  entityId: string;
  createdAt: string;
  actor: { name: string; email: string };
}
export function AuditAdmin() {
  const [page, setPage] = useState(1);
  const { data, error } = useAdminQuery<{ adminAuditLogs: AuditRow[] }>(
    "query($page:Int){adminAuditLogs(page:$page)}",
    { page },
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">DENETİM KAYDI</span>
          <h1>İşlem geçmişi</h1>
          <p>Kim, hangi kayıtta, ne zaman değişiklik yaptı.</p>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      <section className="admin-panel">
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Yönetici</th>
                <th>İşlem</th>
                <th>Kayıt kimliği</th>
              </tr>
            </thead>
            <tbody>
              {data?.adminAuditLogs.map((row) => (
                <tr key={row.id}>
                  <td>{date(row.createdAt)}</td>
                  <td>
                    {row.actor.name}
                    <small>{row.actor.email}</small>
                  </td>
                  <td>{row.action}</td>
                  <td className="mono-cell">{row.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button className="text-link" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Önceki
          </button>
          <span>Sayfa {page}</span>
          <button
            className="text-link"
            disabled={(data?.adminAuditLogs.length ?? 0) < 50}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </button>
        </div>
      </section>
    </>
  );
}
