import { setTimeout } from "node:timers/promises";
const index = process.argv.indexOf("--domain");
const domain = process.argv[index + 1];
if (index < 0 || !/^[a-z0-9.-]+$/.test(domain)) throw new Error("Alan adı gerekli.");
const origin = `https://${domain}`;
let complete = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const page = await fetch(origin, { signal: AbortSignal.timeout(5000), redirect: "error" });
    if (!page.ok || !page.headers.get("content-security-policy")?.includes("nonce-"))
      throw new Error("Mağaza yanıtı geçersiz.");
    const api = await fetch(`${origin}/api/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, "x-quantia-request": "1" },
      body: JSON.stringify({ query: "{settings paymentMethods{provider}}" }),
      signal: AbortSignal.timeout(5000),
    });
    const result = await api.json();
    if (
      !api.ok ||
      result.errors ||
      result.data.paymentMethods.some((method) => method.provider === "DEMO")
    )
      throw new Error("Üretim API kontrolü başarısız.");
    complete = true;
    break;
  } catch {
    if (attempt % 5 === 0)
      console.log("HTTPS bekleniyor. DNS kaydı ve sunucunun 80/443 erişimi kontrol ediliyor…");
    await setTimeout(3000);
  }
}
if (!complete) {
  console.error(
    "HTTPS doğrulanamadı. Alan adının A/AAAA kayıtlarını, 80/443 portlarını ve Caddy loglarını kontrol edip kurulumu tekrar çalıştırın. Başarı işareti yazılmadı.",
  );
  process.exitCode = 1;
} else console.log("HTTPS sertifikası, mağaza ve üretim API kontrolü başarılı.");
