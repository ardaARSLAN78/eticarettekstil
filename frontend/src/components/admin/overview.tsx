"use client";

import { useState } from "react";
import {
  BadgeTurkishLira,
  CalendarDays,
  CreditCard,
  Download,
  FolderPlus,
  Package,
  ShoppingBag,
  Tag,
  TriangleAlert,
  Users,
  Warehouse,
} from "lucide-react";
import { useAdminQuery } from "./use-admin-query";
import { date, money, statusLabels } from "@/lib/format";
import { Notice } from "../ui/notice";
import type { Report } from "./admin-types";
import { SalesChart, StatusChart } from "./report-charts";
import { downloadCsv } from "./admin-ui";

export function Overview({
  name,
  onNavigate,
}: {
  name: string;
  onNavigate: (section: string) => void;
}) {
  const [days, setDays] = useState(30);
  const { data, error } = useAdminQuery<{ adminReports: Report }>(
    "query($days:Int){adminReports(days:$days)}",
    { days },
  );
  const report = data?.adminReports;
  function exportOrders() {
    if (!report) return;
    downloadCsv("quantia-son-siparisler.csv", [
      ["Sipariş", "Müşteri", "Tutar (TL)", "Durum", "Tarih"],
      ...report.recentOrders.map((order) => [
        order.number,
        order.customerName,
        order.total / 100,
        statusLabels[order.status],
        date(order.createdAt),
      ]),
    ]);
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>
            Merhaba {name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p>Mağazanızın satışları, siparişleri ve stokları tek bir yerde.</p>
        </div>
        <label className="admin-period">
          <CalendarDays size={14} />
          <span className="sr-only">Rapor dönemi</span>
          <select
            aria-label="Rapor dönemi"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
        </label>
      </div>
      {error && <Notice>{error}</Notice>}
      {!report ? (
        <p className="admin-empty">Mağaza özeti hazırlanıyor…</p>
      ) : (
        <div className="admin-dashboard">
          <div className="dashboard-primary">
            <div className="admin-stat-grid">
              {[
                {
                  label: "Toplam tahsilat",
                  value: money(report.revenue),
                  icon: BadgeTurkishLira,
                  color: "",
                },
                { label: "Sipariş sayısı", value: report.orders, icon: ShoppingBag, color: "blue" },
                { label: "Kayıtlı müşteri", value: report.customers, icon: Users, color: "violet" },
                {
                  label: "Satılabilir ürün",
                  value: report.products,
                  icon: Package,
                  color: "orange",
                },
              ].map((stat) => (
                <article key={stat.label}>
                  <span className={`stat-icon ${stat.color}`}>
                    <stat.icon size={18} />
                  </span>
                  <i className="stat-accent" />
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
            <div className="dashboard-charts">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <h2>Satış grafiği</h2>
                  <span>Son {days} gün</span>
                </div>
                <SalesChart timeline={report.timeline} />
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <h2>Sipariş durumları</h2>
                </div>
                <StatusChart orders={report.orders} statuses={report.statuses} />
              </section>
            </div>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Son siparişler</h2>
                <button className="text-link" onClick={() => onNavigate("orders")}>
                  Tümünü gör →
                </button>
              </div>
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Müşteri</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          #{order.number}
                          <small>{date(order.createdAt)}</small>
                        </td>
                        <td>
                          {order.customerName}
                          <small>{order.email}</small>
                        </td>
                        <td>{money(order.total)}</td>
                        <td>
                          <span
                            className={`status-pill ${order.status === "CANCELLED" ? "danger" : ""}`}
                          >
                            {statusLabels[order.status]}
                          </span>
                          <small>{statusLabels[order.paymentStatus]}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!report.recentOrders.length && (
                <p className="admin-empty">
                  Henüz sipariş alınmadı. Yeni siparişler burada görünür.
                </p>
              )}
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>En çok satan ürünler</h2>
                <button className="text-link" onClick={() => onNavigate("reports")}>
                  Raporları gör →
                </button>
              </div>
              {report.topProducts.length ? (
                report.topProducts.slice(0, 5).map((item) => (
                  <div className="stock-summary-row" key={item.id}>
                    <span>
                      {item.name}
                      <small>{item.quantity} adet satıldı</small>
                    </span>
                    <strong>{money(item.revenue)}</strong>
                  </div>
                ))
              ) : (
                <p className="admin-empty">Tahsil edilmiş siparişlerden ürün özeti oluşur.</p>
              )}
            </section>
            <p className="admin-footnote">
              Tahsilat, seçilen dönemde oluşturulan ve ödemesi alınmış siparişleri gösterir. Demo ve
              iptal edilen işlemler tahsilata dahil edilmez. Saat dilimi: İstanbul.
            </p>
          </div>
          <aside className="dashboard-rail">
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Yapılacaklar</h2>
              </div>
              {[
                {
                  icon: Package,
                  title: `${report.processing} sipariş hazırlanmayı bekliyor`,
                  text: "Siparişleri gözden geçirin.",
                  section: "orders",
                },
                {
                  icon: TriangleAlert,
                  title: `${report.lowStock.length}${report.lowStock.length === 20 ? "+" : ""} düşük stok uyarısı`,
                  text: "Varyant stoklarını kontrol edin.",
                  section: "inventory",
                },
                {
                  icon: Tag,
                  title: `${report.activeCoupons} aktif kupon`,
                  text: "Kampanyalarınızı yönetin.",
                  section: "campaigns",
                },
                ...(report.refunds
                  ? [
                      {
                        icon: CreditCard,
                        title: `${report.refunds} iade kontrolü gerekiyor`,
                        text: "Ödeme sağlayıcısında iadeyi tamamlayın.",
                        section: "orders",
                      },
                    ]
                  : []),
              ].map((task) => (
                <button
                  className="dashboard-task"
                  key={task.section + task.title}
                  onClick={() => onNavigate(task.section)}
                >
                  <task.icon size={17} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.text}</small>
                  </span>
                  <span className="task-arrow">›</span>
                </button>
              ))}
            </section>
            <section className="admin-panel dashboard-promo">
              <h2>Seçkinizi daha çok kişiye ulaştırın.</h2>
              <p>
                Ürünlere, kategorilere veya koleksiyonunuza özel kampanya ve kuponlar hazırlayın.
              </p>
              <button className="button" onClick={() => onNavigate("campaigns")}>
                Kampanyaları yönet →
              </button>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Hızlı işlemler</h2>
              </div>
              <div className="quick-actions">
                {[
                  { icon: Package, label: "Ürün yönet", section: "products" },
                  { icon: FolderPlus, label: "Kategori ekle", section: "taxonomy" },
                  { icon: Tag, label: "Kupon tanımla", section: "campaigns" },
                  { icon: Warehouse, label: "Stok düzenle", section: "inventory" },
                  { icon: Users, label: "Aboneleri gör", section: "marketing" },
                ].map((action) => (
                  <button key={action.section} onClick={() => onNavigate(action.section)}>
                    <action.icon size={17} />
                    {action.label}
                  </button>
                ))}
                <button onClick={exportOrders}>
                  <Download size={17} />
                  Son siparişler CSV
                </button>
              </div>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Stok uyarıları</h2>
                <button className="text-link" onClick={() => onNavigate("inventory")}>
                  Tümü →
                </button>
              </div>
              {report.lowStock.length ? (
                report.lowStock.slice(0, 5).map((item) => (
                  <div className="stock-summary-row" key={item.id}>
                    <span>
                      {item.name}
                      <small>
                        {item.color} / {item.size} · {item.warehouse}
                      </small>
                    </span>
                    <strong className="status-pill warning">{item.stock} adet</strong>
                  </div>
                ))
              ) : (
                <p className="admin-footnote">
                  Stoklarınız yeterli. Şu anda düşük stok uyarısı bulunmuyor.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
