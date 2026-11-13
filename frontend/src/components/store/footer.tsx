import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";
import type { Category, StoreSettings } from "@/lib/types";
import { Logo } from "../brand/logo";

export function Footer({
  settings,
  categories,
}: {
  settings: StoreSettings;
  categories: Category[];
}) {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          {settings.logoUrl === "/brand/quantia-logo.svg" ? (
            <Logo light name={settings.brandName} />
          ) : (
            <Link href="/" className="custom-logo footer-custom-logo">
              <img src={settings.logoUrl} alt={settings.brandName} />
            </Link>
          )}
          <p>
            {settings.tagline}
            <br />
            İncelikle seçilmiş klasik erkek giyimi.
          </p>
          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Quantia Instagram"
            >
              <Camera size={19} />
            </a>
          )}
        </div>
        <div>
          <h3>KOLEKSİYON</h3>
          {categories.slice(0, 6).map((category) => (
            <Link key={category.id} href={`/koleksiyon?kategori=${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </div>
        <div>
          <h3>SİZE YARDIMCI OLALIM</h3>
          <Link href="/hesabim">Hesabım & siparişlerim</Link>
          <Link href="/bilgilendirme/iade">Teslimat & iade</Link>
          <Link href="/iletisim">İletişim</Link>
          <Link href="/bilgilendirme/satis">Satış koşulları</Link>
          <Link href="/bilgilendirme/gizlilik">Gizlilik</Link>
        </div>
        <div className="footer-contact">
          <h3>BİR MERHABA DEYİN</h3>
          <a href={`mailto:${settings.contactEmail}`}>
            {settings.contactEmail} <ArrowUpRight size={14} />
          </a>
          <a href={`tel:${settings.contactPhone.replace(/[^+\d]/g, "")}`}>
            {settings.contactPhone}
          </a>
          <p>{settings.address}</p>
          <Link href="/hikayemiz" className="footer-story">
            Quantia'nın hikâyesi <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.brandName}. Tüm hakları saklıdır.
        </span>
        <span>İSTANBUL · TÜRKİYE</span>
        <span>
          TR / TRY <span className="footer-dot">●</span> Özenle, Quantia.
        </span>
      </div>
    </footer>
  );
}
