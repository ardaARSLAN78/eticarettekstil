import { config } from "../../core/config/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { decryptSecrets, encryptSecrets } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { getSettings } from "../settings/settings.service.js";
import { googleIntegrationDto } from "./reviews.dto.js";

interface PlaceResponse {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    publishTime?: string;
    googleMapsUri?: string;
    visitDate?: { year?: number; month?: number };
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
}

export async function googleReviews(context: Context) {
  const [settings, stored] = await Promise.all([
    getSettings(context.db),
    context.db.integrationConfig.findUnique({ where: { provider: "GOOGLE_PLACES" } }),
  ]);
  const key = stored
    ? stored.enabled
      ? decryptSecrets(stored.encrypted).apiKey
      : undefined
    : config.GOOGLE_PLACES_API_KEY;
  const configured = Boolean(key && settings.googlePlaceId && settings.showGoogleReviews);
  const empty = {
    configured,
    available: false,
    rating: null,
    count: 0,
    mapsUrl: null,
    reviews: [],
    message: configured
      ? "Google yorumlarına şu anda ulaşılamıyor."
      : "Google işletme bağlantısı henüz tamamlanmadı.",
  };
  if (!configured) return empty;
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(settings.googlePlaceId)}?languageCode=tr`,
      {
        headers: {
          "X-Goog-Api-Key": key!,
          "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
        },
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      },
    );
    if (!response.ok) return empty;
    const data = (await response.json()) as PlaceResponse;
    return {
      configured,
      available: true,
      rating: data.rating ?? null,
      count: data.userRatingCount ?? 0,
      mapsUrl: data.googleMapsUri ?? null,
      message: "Google üzerindeki gerçek müşteri değerlendirmeleri.",
      reviews: (data.reviews ?? []).slice(0, 5).map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google kullanıcısı",
        authorUrl: r.authorAttribution?.uri ?? null,
        avatar: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? 0,
        text: r.text?.text ?? "",
        publishedAt: r.publishTime ?? "",
        sourceUrl: r.googleMapsUri ?? data.googleMapsUri ?? null,
        visitDate: r.visitDate
          ? `${r.visitDate.year}-${String(r.visitDate.month).padStart(2, "0")}`
          : null,
      })),
    };
  } catch {
    return empty;
  }
}

export async function saveGoogleIntegration(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const input = googleIntegrationDto.parse(raw);
  const previous = await context.db.integrationConfig.findUnique({
    where: { provider: "GOOGLE_PLACES" },
  });
  const apiKey =
    input.apiKey ||
    (previous ? decryptSecrets(previous.encrypted).apiKey : config.GOOGLE_PLACES_API_KEY);
  if (input.enabled && !apiKey) fail("Google Places API anahtarı gereklidir.");
  const data = { enabled: input.enabled, encrypted: encryptSecrets({ apiKey: apiKey ?? "" }) };
  await context.db.$transaction([
    context.db.integrationConfig.upsert({
      where: { provider: "GOOGLE_PLACES" },
      create: { provider: "GOOGLE_PLACES", ...data },
      update: data,
    }),
    context.db.auditLog.create({
      data: { actorId: admin.id, action: "GOOGLE_INTEGRATION_UPDATED", entityId: "GOOGLE_PLACES" },
    }),
  ]);
  return true;
}
