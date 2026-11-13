import { notFound } from "next/navigation";
import { getBootstrap } from "@/lib/server-api";

const titles: Record<string, string> = {
  gizlilik: "Gizlilik & kişisel veriler",
  iade: "Teslimat & iade",
  satis: "Satış koşulları",
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: titles[(await params).slug] ?? "Bilgilendirme" };
}
export default async function Information({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  if (!titles[slug]) notFound();
  const { settings } = await getBootstrap();
  const text =
    slug === "gizlilik"
      ? settings.privacyText
      : slug === "iade"
        ? settings.returnsText
        : settings.termsText;
  return (
    <article className="policy-page page-container">
      <span className="eyebrow">QUANTIA BİLGİLENDİRME</span>
      <h1>{titles[slug]}</h1>
      <div className="policy-text">{text}</div>
    </article>
  );
}
