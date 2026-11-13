import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state page-container">
      <span className="eyebrow">QUANTIA</span>
      <h1>Bu sayfa yerinde değil.</h1>
      <p>Aradığınız parça taşınmış veya koleksiyondan kalkmış olabilir.</p>
      <Link className="button" href="/koleksiyon">
        Koleksiyonu keşfet
      </Link>
    </div>
  );
}
