import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import { getBootstrap } from "@/lib/server-api";
import "./globals.css";
import "@/styles/large-screens.css";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBootstrap();
  return {
    metadataBase: new URL(process.env.APP_ORIGIN ?? "http://localhost:3000"),
    title: {
      default: `${settings.brandName} — Zamansız Erkek Giyimi`,
      template: `%s | ${settings.brandName}`,
    },
    description:
      "Doğal dokular, incelikle düşünülmüş detaylar. Quantia klasik erkek giyim koleksiyonuyla zamansız bir gardırop keşfedin.",
    icons: { icon: settings.monogramUrl },
    robots: { index: settings.allowIndexing, follow: settings.allowIndexing },
    openGraph: {
      locale: "tr_TR",
      type: "website",
      siteName: settings.brandName,
      images: [settings.heroImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
