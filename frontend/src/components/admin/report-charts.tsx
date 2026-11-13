import { money, statusLabels } from "@/lib/format";
import type { Report } from "./admin-types";

export function SalesChart({ timeline }: Pick<Report, "timeline">) {
  const maximum = Math.max(100, ...timeline.map((point) => point.revenue));
  const points = timeline
    .map(
      (point, index) =>
        `${(index * 1000) / Math.max(1, timeline.length - 1)},${180 - (point.revenue / maximum) * 160}`,
    )
    .join(" ");
  return (
    <div>
      <svg
        className="sales-chart"
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Günlük tahsilat grafiği. En yüksek günlük tutar ${money(maximum)}.`}
      >
        {[20, 73, 126, 180].map((y) => (
          <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#edf0f2" strokeDasharray="4 5" />
        ))}
        <polygon points={`0,180 ${points} 1000,180`} fill="#eaf5ee" />
        <polyline
          points={points}
          stroke="#6ba37d"
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-labels">
        <span>{timeline[0]?.day}</span>
        <span>{timeline.at(-1)?.day}</span>
      </div>
      <p className="chart-empty">
        {timeline.some((point) => point.revenue)
          ? "Tahsil edilmiş sipariş tutarları · TL"
          : "Seçilen dönemde tahsil edilmiş sipariş yok."}
      </p>
    </div>
  );
}

const statusColors = ["#d7b05d", "#779bd9", "#71a486", "#b598d9", "#d0d6de", "#dc9999"];
export function StatusChart({ statuses, orders }: Pick<Report, "statuses" | "orders">) {
  let offset = 0;
  const slices = statuses.map((item, index) => {
    const start = offset;
    offset += (item.count / Math.max(1, orders)) * 100;
    return `${statusColors[index % statusColors.length]} ${start}% ${offset}%`;
  });
  return (
    <div>
      <div
        className="status-donut"
        style={{ background: slices.length ? `conic-gradient(${slices.join(",")})` : "#edf0f3" }}
      >
        <div>
          <strong>{orders}</strong>
          <small>Toplam sipariş</small>
        </div>
      </div>
      <div className="status-legend">
        {statuses.length ? (
          statuses.map((item, index) => (
            <div key={item.status}>
              <i style={{ background: statusColors[index % statusColors.length] }} />
              {statusLabels[item.status] ?? item.status}
              <b>{item.count}</b>
            </div>
          ))
        ) : (
          <div>Henüz sipariş bulunmuyor.</div>
        )}
      </div>
    </div>
  );
}
