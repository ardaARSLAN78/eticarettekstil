import type { MetadataRoute } from "next";
import { getBootstrap } from "@/lib/server-api";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { settings } = await getBootstrap();
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      ...(settings.allowIndexing
        ? { allow: "/", disallow: ["/yonetim", "/hesabim", "/odeme", "/siparis/", "/api/"] }
        : { disallow: "/" }),
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
