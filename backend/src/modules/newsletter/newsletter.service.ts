import type { Context } from "../../graphql/context.js";
import { enforceLimit } from "../../core/redis/index.js";
import { newsletterDto } from "./newsletter.dto.js";

export async function subscribe(context: Context, raw: unknown) {
  const input = newsletterDto.parse(raw);
  await enforceLimit(`newsletter:${context.request.ip}`, 5, 3600);
  await context.db.subscriber.upsert({
    where: { email: input.email },
    create: { email: input.email },
    update: { active: true, consentAt: new Date(), unsubscribedAt: null },
  });
  // Aynı cevap, kayıtlı e-posta adreslerinin dışarıdan sorgulanmasını önler.
  return true;
}
