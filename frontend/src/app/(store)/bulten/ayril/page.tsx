import type { Metadata } from "next";
import { NewsletterUnsubscribe } from "@/components/store/newsletter-unsubscribe";

export const metadata: Metadata = {
  title: "Bülten tercihleri",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <NewsletterUnsubscribe token={typeof token === "string" ? token : ""} />;
}
