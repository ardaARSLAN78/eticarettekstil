import { getBootstrap } from "@/lib/server-api";
import { ShopProvider } from "@/components/store/shop-provider";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { settings, categories } = await getBootstrap();
  return (
    <div style={{ "--green": settings.themeColor } as React.CSSProperties}>
      <ShopProvider settings={settings}>
        <a className="skip-link" href="#icerik">
          İçeriğe geç
        </a>
        <Header />
        <main id="icerik">{children}</main>
        <Footer settings={settings} categories={categories} />
      </ShopProvider>
    </div>
  );
}
