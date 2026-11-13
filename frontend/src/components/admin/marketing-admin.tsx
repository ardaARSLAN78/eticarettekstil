"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { date, errorMessage } from "@/lib/format";
import { Notice } from "../ui/notice";
import { useAdminNotice } from "./admin-context";
import type { Paged } from "./admin-types";
import { AdminSearch, downloadCsv, Pagination } from "./admin-ui";
import { useAdminQuery } from "./use-admin-query";

interface Subscriber {
  id: string;
  email: string;
  active: boolean;
  consentAt: string;
  unsubscribedAt: string | null;
  unsubscribeUrl: string;
}

export function MarketingAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const notice = useAdminNotice();
  const { data, error, reload } = useAdminQuery<{
    adminSubscribers: Paged<Subscriber> & { active: number };
  }>("query($filter:JSON){adminSubscribers(filter:$filter)}", {
    filter: { search, page, activeOnly },
  });
  const result = data?.adminSubscribers;
  async function disable(id: string) {
    setBusy(id);
    setActionError("");
    try {
      await api("mutation($id:ID!){disableSubscriber(id:$id)}", { id });
      notice("Abonelik kapatıldı. İzin kaydı korundu.");
      await reload();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy("");
    }
  }
  function exportPage() {
    if (!result) return;
    downloadCsv(`quantia-aboneler-sayfa-${page}.csv`, [
      ["E-posta", "Etkin", "İzin tarihi", "Ayrılma bağlantısı"],
      ...result.items.map((subscriber) => [
        subscriber.email,
        subscriber.active,
        subscriber.consentAt,
        subscriber.unsubscribeUrl,
      ]),
    ]);
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">İZİNLİ İLETİŞİM</span>
          <h1>Pazarlama & bülten</h1>
          <p>{result?.active ?? 0} etkin abone · Açık izin kayıtları ve abonelik yönetimi.</p>
        </div>
        <button className="button button-outline" disabled={!result} onClick={exportPage}>
          <Download size={15} />
          Bu sayfayı CSV indir
        </button>
      </div>
      <div className="admin-info-box">
        Aboneler mağaza bülten formundaki açık onaylarıyla kaydedilir. E-posta gönderim servisi
        henüz bağlı değil. Dışa aktarımdaki kişiye özel ayrılma bağlantısı e-posta şablonunuzda
        kullanılabilir.
      </div>
      {(error || actionError) && <Notice>{actionError || error}</Notice>}
      <section className="admin-panel">
        <div className="admin-filter-bar">
          <AdminSearch
            placeholder="Abone e-posta ara"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => {
                setActiveOnly(event.target.checked);
                setPage(1);
              }}
            />
            Yalnızca etkin aboneler
          </label>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>E-posta</th>
                <th>İzin tarihi</th>
                <th>Durum</th>
                <th>Ayrılma tarihi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.email}</td>
                  <td>{date(subscriber.consentAt)}</td>
                  <td>
                    <span className={`status-pill ${subscriber.active ? "" : "warning"}`}>
                      {subscriber.active ? "Etkin" : "Ayrıldı"}
                    </span>
                  </td>
                  <td>{subscriber.unsubscribedAt ? date(subscriber.unsubscribedAt) : "—"}</td>
                  <td>
                    {subscriber.active && (
                      <button
                        className="text-link"
                        disabled={busy === subscriber.id}
                        onClick={() => void disable(subscriber.id)}
                      >
                        {busy === subscriber.id ? "Kaydediliyor…" : "Aboneliği kapat"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result?.items.length && (
          <p className="admin-empty">Bu filtreye uygun abone bulunamadı.</p>
        )}
        {result && (
          <Pagination page={page} pages={result.pages} total={result.total} onPage={setPage} />
        )}
      </section>
    </>
  );
}
