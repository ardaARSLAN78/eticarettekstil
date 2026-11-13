import { fail } from "../../../lib/errors.js";

// Yalnızca adaptörde sabitlenmiş sağlayıcı uçlarına istek gönderilir; panelden URL alınmaz.
export async function providerFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    fail("Ödeme kuruluşuna şu anda ulaşılamıyor. Lütfen tekrar deneyin.", "PAYMENT_PROVIDER_ERROR");
  return response.json() as Promise<T>;
}
