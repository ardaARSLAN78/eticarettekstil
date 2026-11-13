import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/server-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const { seoEntries } = await serverApi<{
    seoEntries: { path: string; updatedAt: string; canonicalUrl: string | null }[];
  }>("{seoEntries{path updatedAt canonicalUrl}}");
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/koleksiyon`, changeFrequency: "daily", priority: 0.9 },
    ...seoEntries.map((entry) => ({
      url: entry.canonicalUrl ?? new URL(entry.path, origin).href,
      lastModified: entry.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
