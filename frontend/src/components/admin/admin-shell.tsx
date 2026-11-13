"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Brush,
  CreditCard,
  FileText,
  FolderTree,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  UserCog,
  Warehouse,
  X,
} from "lucide-react";
import type { User } from "@/lib/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { Logo } from "../brand/logo";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { AdminContext } from "./admin-context";
import { Overview } from "./overview";
import { ProductsAdmin } from "./products-admin";
import { TaxonomyAdmin } from "./taxonomy-admin";
import { OrdersAdmin } from "./orders-admin";
import { CampaignsAdmin } from "./campaigns-admin";
import { ContentAdmin } from "./content-admin";
import { PaymentsAdmin } from "./payments-admin";
import { MediaAdmin } from "./media-admin";
import { SeoAdmin, AuditAdmin } from "./seo-admin";
import { CustomersAdmin } from "./customers-admin";
import { InventoryAdmin } from "./inventory-admin";
import { ReportsAdmin } from "./reports-admin";
import { MarketingAdmin } from "./marketing-admin";
import { UsersAdmin } from "./users-admin";

const sections = [
  { id: "overview", title: "Ana sayfa", icon: LayoutDashboard },
  { id: "orders", title: "Siparişler", icon: ShoppingBag },
  { id: "products", title: "Ürünler", icon: Package },
  { id: "taxonomy", title: "Kategoriler & tanımlar", icon: FolderTree },
  { id: "customers", title: "Müşteriler", icon: Users },
  { id: "campaigns", title: "Kampanyalar & kuponlar", icon: Tag },
  { id: "content", title: "İçerik yönetimi", icon: FileText },
  { id: "design", title: "Tasarım", icon: Brush },
  { id: "reports", title: "Raporlar", icon: BarChart3 },
  { id: "marketing", title: "Pazarlama", icon: Megaphone },
  { id: "payments", title: "Ödeme altyapıları", icon: CreditCard },
  { id: "media", title: "Görsel kütüphanesi", icon: Image },
  { id: "inventory", title: "Stok & depo", icon: Warehouse },
  { id: "users", title: "Kullanıcılar", icon: UserCog },
  { id: "settings", title: "Ayarlar", icon: Settings },
  { id: "seo", title: "SEO & yönlendirmeler", icon: Search },
  { id: "audit", title: "İşlem geçmişi", icon: FileText },
];

export function AdminShell({ initialUser }: { initialUser: User | null }) {
  const [user, setUser] = useState(initialUser);
  const [section, setSection] = useState("overview");
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const readSection = () => {
      const id = window.location.hash.slice(1);
      setSection(sections.some((item) => item.id === id) ? id : "overview");
    };
    readSection();
    window.addEventListener("hashchange", readSection);
    return () => window.removeEventListener("hashchange", readSection);
  }, []);

  function navigate(id: string) {
    setSection(id);
    window.location.hash = id;
    setMobile(false);
    setNotice("");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const data = await api<{ login: User }>(
        "mutation($input:LoginInput!){login(input:$input){id name email role}}",
        { input: { email: fields.get("email"), password: fields.get("password") } },
      );
      setUser(data.login);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("mutation{logout}");
    setUser(null);
    setNotice("");
  }

  if (!user)
    return (
      <div className="admin-login">
        <div>
          <Logo />
          <span className="eyebrow">MAĞAZA YÖNETİMİ</span>
          <h1>Her detay, sizin elinizde.</h1>
          <p>Quantia yönetim hesabınızla giriş yapın.</p>
          <form onSubmit={login}>
            <Field
              label="Yönetici e-posta"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
            <Field
              label="Şifre"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && <Notice>{error}</Notice>}
            <button className="button button-full" disabled={busy}>
              {busy ? "Kontrol ediliyor…" : "Yönetim paneline giriş yap"}
            </button>
          </form>
          <Link className="text-link" href="/">
            Mağazaya dön <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    );
  if (user.role !== "ADMIN")
    return (
      <div className="empty-state">
        <h1>Yönetici erişimi gerekiyor.</h1>
        <p>Bu hesabın mağazayı yönetme yetkisi bulunmuyor.</p>
        <button className="button" onClick={() => void logout()}>
          Başka hesapla giriş yap
        </button>
      </div>
    );

  let content: React.ReactNode;
  switch (section) {
    case "products":
      content = <ProductsAdmin />;
      break;
    case "taxonomy":
      content = <TaxonomyAdmin />;
      break;
    case "orders":
      content = <OrdersAdmin />;
      break;
    case "campaigns":
      content = <CampaignsAdmin />;
      break;
    case "content":
      content = <ContentAdmin key="content" initialGroup="hero" />;
      break;
    case "design":
      content = <ContentAdmin key="design" initialGroup="brand" />;
      break;
    case "settings":
      content = <ContentAdmin key="settings" initialGroup="shipping" />;
      break;
    case "customers":
      content = <CustomersAdmin />;
      break;
    case "inventory":
      content = <InventoryAdmin />;
      break;
    case "reports":
      content = <ReportsAdmin />;
      break;
    case "marketing":
      content = <MarketingAdmin />;
      break;
    case "users":
      content = <UsersAdmin />;
      break;
    case "payments":
      content = <PaymentsAdmin />;
      break;
    case "media":
      content = <MediaAdmin />;
      break;
    case "seo":
      content = <SeoAdmin />;
      break;
    case "audit":
      content = <AuditAdmin />;
      break;
    default:
      content = <Overview name={user.name} onNavigate={navigate} />;
  }

  return (
    <AdminContext.Provider value={setNotice}>
      <div className={`admin-shell ${mobile ? "menu-open" : ""}`}>
        {mobile && (
          <button
            className="admin-menu-backdrop"
            aria-label="Yönetim menüsünü kapat"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className="admin-sidebar">
          <button
            className="icon-button admin-sidebar-close"
            aria-label="Menüyü kapat"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
          <div className="admin-brand">
            <Logo href="/yonetim" />
            <span>MAĞAZA YÖNETİMİ</span>
          </div>
          <nav aria-label="Yönetim menüsü">
            {sections.map((item) => (
              <button
                key={item.id}
                className={section === item.id ? "active" : ""}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={17} strokeWidth={1.5} />
                {item.title}
              </button>
            ))}
          </nav>
          <Link href="/" className="admin-store-link" target="_blank">
            Mağazayı görüntüle <ArrowUpRight size={16} />
          </Link>
          <div className="admin-user">
            <span>
              {user.name}
              <small>{user.email}</small>
            </span>
            <button
              className="icon-button"
              aria-label="Yönetimden çıkış yap"
              onClick={() => void logout()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <button
              className="icon-button admin-menu-button"
              aria-label="Yönetim menüsü"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span>
              QUANTIA <i>/</i> {sections.find((item) => item.id === section)?.title}
            </span>
            <span className="admin-session">
              <span /> Güvenli oturum
            </span>
          </header>
          <main className="admin-content">
            {notice && (
              <div className="admin-notice" role="status">
                {notice}
                <button
                  className="icon-button"
                  aria-label="Bildirimi kapat"
                  onClick={() => setNotice("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {content}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
