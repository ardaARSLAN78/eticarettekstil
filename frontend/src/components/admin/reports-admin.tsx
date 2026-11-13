"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { money } from "@/lib/format";
import { Notice } from "../ui/notice";
import type { Report } from "./admin-types";
import { downloadCsv } from "./admin-ui";
import { SalesChart, StatusChart } from "./report-charts";
import { useAdminQuery } from "./use-admin-query";

export function ReportsAdmin() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdminQuery<{ adminReports: Report }>(
    "query($days:Int){adminReports(days:$days)}",
    { days },
  );
  const report = data?.adminReports;
  function exportReport() {
    if (!report) return;
    downloadCsv(`quantia-${days}-gun-satis.csv`, [
      ["Gün", "Tahsilat (TL)", "Ödenmiş sipariş"],
      ...report.timeline.map((row) => [row.day, row.revenue / 100, row.orders]),
    ]);
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">MAĞAZA PERFORMANSI</span>
          <h1>Raporlar</h1>
          <p>Ödenen siparişler üzerinden dönemsel satış ve ürün analizi.</p>
        </div>
        <div className="admin-heading-actions">
          <select
            className="admin-filter"
            aria-label="Rapor dönemi"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
            <option value={365}>Son 365 gün</option>
          </select>
          <button className="button button-outline" disabled={!report} onClick={exportReport}>
            <Download size={15} />
            CSV indir
          </button>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {report && (
        <>
          <div className="admin-metrics-row">
            {[
              ["Tahsilat", money(report.revenue)],
              ["Kargo tahsilatı", money(report.shipping)],
              ["Uygulanan indirim", money(report.discountAmount)],
              ["Toplam KDV", money(report.taxAmount)],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="admin-detail-grid">
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Günlük satış</h2>
              </div>
              <SalesChart timeline={report.timeline} />
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Tüm sipariş durumları</h2>
              </div>
              <StatusChart orders={report.orders} statuses={report.statuses} />
            </section>
          </div>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>En çok satılan ürünler</h2>
              <span>Ödenmiş siparişler · İlk 10</span>
            </div>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>İndirim sonrası ürün tahsilatı</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!report.topProducts.length && (
              <p className="admin-empty">Bu dönemde tahsil edilmiş sipariş yok.</p>
            )}
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Günlük döküm</h2>
              <span>Son {days} gün · İstanbul saati</span>
            </div>
            <div className="admin-table-scroll report-daily">
              <table>
                <thead>
                  <tr>
                    <th>Gün</th>
                    <th>Ödenmiş sipariş</th>
                    <th>Tahsilat</th>
                  </tr>
                </thead>
                <tbody>
                  {[...report.timeline].reverse().map((item) => (
                    <tr key={item.day}>
                      <td>{item.day}</td>
                      <td>{item.orders}</td>
                      <td>{money(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="admin-footnote">
            Dönem siparişin oluşturulma tarihine göre belirlenir. Demo işlemler, iptaller ve iade
            bekleyen işlemler tahsilata dahil edilmez. İndirim ve KDV tutarları siparişte saklanan
            hesaplamalardır.
          </p>
        </>
      )}
    </>
  );
}
