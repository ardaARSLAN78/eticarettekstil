"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state page-container">
      <span className="eyebrow">QUANTIA</span>
      <h1>Kısa bir ara.</h1>
      <p>Mağazaya şu anda ulaşılamıyor. Lütfen bir kez daha deneyin.</p>
      <button className="button" onClick={reset}>
        Yeniden dene
      </button>
      <Link className="text-link" href="/">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
