import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { getBootstrap, serverApi } from "@/lib/server-api";
import { productsQuery } from "@/lib/queries";
import type { GoogleReviews, ProductPage } from "@/lib/types";
import { money } from "@/lib/format";
import { Photo } from "@/components/ui/photo";
import { ProductCard } from "@/components/store/product-card";
import { Newsletter } from "@/components/store/newsletter";
import { Reviews } from "@/components/store/reviews";

export default async function Home() {
  const [{ settings, categories }, { products }, { googleReviews }] = await Promise.all([
    getBootstrap(),
    serverApi<{ products: ProductPage }>(productsQuery, {
      filter: { featured: true, limit: 4, sort: "NEWEST" },
    }),
    serverApi<{ googleReviews: GoogleReviews }>(
      "{googleReviews{configured available rating count mapsUrl message reviews{author authorUrl avatar rating text publishedAt sourceUrl visitDate}}}",
    ),
  ]);
  const titleLines = settings.heroTitle.split("\n");

  return (
    <>
      <section className="hero">
        <Photo
          src={settings.heroImage}
          alt="Quantia klasik erkek giyim koleksiyonu, doğal dokular ve Akdeniz zarafeti"
          priority
          sizes="(max-width: 650px) 1000px, 100vw"
          className="hero-photo"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <i /> {settings.heroEyebrow}
          </span>
          <h1>
            {titleLines[0]}
            <br />
            <em>{titleLines.slice(1).join(" ")}</em>
          </h1>
          <p>{settings.heroSubtitle}</p>
          <Link href="/koleksiyon" className="button button-cream">
            {settings.heroCta}
            <ArrowUpRight size={18} />
          </Link>
          <div className="hero-signature">
            <span /> THE ART OF TIMELESS LIVING
          </div>
        </div>
        <div className="hero-side-note">DOĞAL DOKULAR. KALICI BİR DURUŞ.</div>
        <div className="hero-season">
          QUANTIA <span>—</span> 2026
        </div>
      </section>
      <section className="benefits">
        <div>
          <Truck strokeWidth={1.15} />
          <span>
            <strong>Kargo bizden</strong>
            <small>{money(settings.freeShippingThreshold)} ve üzeri alışverişlerde</small>
          </span>
        </div>
        <div>
          <PackageCheck strokeWidth={1.15} />
          <span>
            <strong>Özenli bir deneyim</strong>
            <small>İlk seçimden son detaya</small>
          </span>
        </div>
        <div>
          <ShieldCheck strokeWidth={1.15} />
          <span>
            <strong>Güvenli ödeme</strong>
            <small>Korumalı ödeme altyapısı</small>
          </span>
        </div>
        <div>
          <Headphones strokeWidth={1.15} />
          <span>
            <strong>Bir mesaj uzağınızdayız</strong>
            <small>Size yardımcı olalım</small>
          </span>
        </div>
      </section>
      <section className="category-section page-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GARDIROBUN TEMELLERİ</span>
            <h2>Her günün klasikleri.</h2>
          </div>
          <Link className="text-link" href="/koleksiyon">
            Tüm koleksiyon <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.slice(0, 6).map((category, index) => (
            <Link
              className="category-card"
              key={category.id}
              href={`/koleksiyon?kategori=${category.slug}`}
            >
              <Photo
                src={category.image}
                alt={category.name}
                sizes="(max-width: 650px) 45vw, 17vw"
              />
              <div className="category-overlay" />
              <span className="category-number">0{index + 1}</span>
              <div>
                <h3>{category.name}</h3>
                <span>
                  Keşfet <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="new-arrivals page-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YENİ SEZON SEÇKİSİ</span>
            <h2>Yeni sezon, tanıdık bir his.</h2>
          </div>
          <Link className="text-link" href="/koleksiyon?siralama=NEWEST">
            Tüm yeni gelenler <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="editorial page-container">
        <div className="editorial-image">
          <Photo
            src={settings.editorialImage}
            alt="Quantia'nın zamansız stil anlayışı"
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <span>QUANTIA JOURNAL · VOL. 01</span>
        </div>
        <div className="editorial-content">
          <img className="editorial-monogram" src={settings.monogramUrl} alt="" />
          <span className="eyebrow">{settings.editorialEyebrow}</span>
          <h2>{settings.editorialTitle}</h2>
          <p>{settings.editorialText}</p>
          <Link className="text-link" href="/hikayemiz">
            Hikâyemizi keşfedin <ArrowUpRight size={17} />
          </Link>
          <span className="editorial-bottom">
            <Leaf size={15} /> DOĞAL OLANIN İZİNDE
          </span>
        </div>
      </section>
      <section className="campaigns page-container">
        <Link className="campaign-dark" href="/koleksiyon?secim=zamansiz-secki">
          <span className="eyebrow">AZLA DAHA FAZLASI</span>
          <h2>{settings.campaignTitle}</h2>
          <p>{settings.campaignText}</p>
          <span className="text-link">
            Seçkiyi keşfet <ArrowRight size={17} />
          </span>
          <span className="campaign-watermark">Q</span>
        </Link>
        <Link className="campaign-light" href="/koleksiyon?kategori=gomlekler">
          <div>
            <span className="eyebrow">DOĞALLIĞA BİR DOKUNUŞ</span>
            <h2>
              İyi bir dokunun
              <br />
              <em>yerini hiçbir şey tutmaz.</em>
            </h2>
            <span className="text-link">
              Gömlek seçkisi <ArrowUpRight size={17} />
            </span>
          </div>
          <div className="campaign-product">
            <Photo
              src={settings.campaignImage}
              alt="Doğal dokulu Quantia gömlek seçkisi"
              sizes="35vw"
            />
          </div>
        </Link>
      </section>
      <Reviews data={googleReviews} />
      <Newsletter title={settings.newsletterTitle} />
    </>
  );
}
