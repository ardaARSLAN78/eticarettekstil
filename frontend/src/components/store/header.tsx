"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Search, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import { Logo } from "../brand/logo";
import { useShop } from "./shop-provider";

const navigation = [
  { label: "Ana sayfa", href: "/" },
  { label: "Koleksiyon", href: "/koleksiyon" },
  { label: "Yeni gelenler", href: "/koleksiyon?siralama=NEWEST" },
  { label: "Zamansızlar", href: "/koleksiyon?secim=zamansiz-secki" },
  { label: "Hikâyemiz", href: "/hikayemiz" },
];

export function Header() {
  const { cart, settings, openCart, user } = useShop();
  const pathname = usePathname();
  const search = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState(false);

  return (
    <>
      <div className="announcement">
        <span>
          <Truck size={13} /> {settings.announcement}
        </span>
        <span className="announcement-center">{settings.tagline}</span>
        <Link href="/iletisim">
          Bize ulaşın <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="icon-button mobile-only"
            aria-label={menu ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
          {settings.logoUrl === "/brand/quantia-logo.svg" ? (
            <Logo name={settings.brandName} />
          ) : (
            <Link href="/" className="custom-logo">
              <img src={settings.logoUrl} alt={settings.brandName} />
            </Link>
          )}
          <nav className="desktop-nav" aria-label="Ana menü">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={pathname === item.href ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Ürün ara"
              onClick={() => search.current?.showModal()}
            >
              <Search size={21} strokeWidth={1.4} />
            </button>
            <Link
              className="icon-button account-button"
              href="/hesabim"
              aria-label={user ? "Hesabım" : "Giriş yap"}
            >
              <UserRound size={21} strokeWidth={1.4} />
            </Link>
            <button
              className="icon-button bag-button"
              aria-label={
                cart
                  ? `Alışveriş çantası, ${cart.itemCount} ürün`
                  : "Alışveriş çantası hazırlanıyor"
              }
              onClick={openCart}
            >
              <ShoppingBag size={21} strokeWidth={1.4} />
              <span>{cart?.itemCount ?? "…"}</span>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Mobil menü">
            {navigation.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMenu(false)}>
                {item.label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <dialog className="search-dialog" ref={search} aria-label="Koleksiyonda arama">
        <div className="search-heading">
          <span className="eyebrow">ARADIĞINIZ KLASİK</span>
          <button
            className="icon-button"
            aria-label="Aramayı kapat"
            onClick={() => search.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <form action="/koleksiyon" method="get" onSubmit={() => search.current?.close()}>
          <Search size={23} />
          <input
            type="search"
            name="arama"
            placeholder="Polo, keten gömlek, blazer…"
            aria-label="Ürün adı"
            autoFocus
            required
            maxLength={80}
          />
          <button className="text-link" type="submit">
            Ara <ArrowUpRight size={17} />
          </button>
        </form>
        <p className="muted">Sade bir gardırop. Güçlü bir karakter.</p>
      </dialog>
    </>
  );
}
