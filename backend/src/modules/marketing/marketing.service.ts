import { createHmac } from "node:crypto";
import { config } from "../../core/config/index.js";
import { id } from "../../core/sanitizer/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { safeEqual } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { subscriberFilterDto } from "./marketing.dto.js";

export function unsubscribeToken(subscriberId: string) {
  const signature = createHmac("sha256", Buffer.from(config.ENCRYPTION_KEY, "hex"))
    .update(`quantia:unsubscribe:${subscriberId}`)
    .digest("hex");
  return `${subscriberId}.${signature}`;
}

export async function listSubscribers(context: Context, raw: unknown) {
  requireAdmin(context);
  const input = subscriberFilterDto.parse(raw ?? {});
  const where = {
    ...(input.activeOnly ? { active: true } : {}),
    ...(input.search ? { email: { contains: input.search, mode: "insensitive" as const } } : {}),
  };
  const [items, total, active] = await Promise.all([
    context.db.subscriber.findMany({
      where,
      skip: (input.page - 1) * 50,
      take: 50,
      orderBy: { consentAt: "desc" },
    }),
    context.db.subscriber.count({ where }),
    context.db.subscriber.count({ where: { active: true } }),
  ]);
  return {
    items: items.map((subscriber) => ({
      ...subscriber,
      unsubscribeUrl: `${config.WEB_ORIGIN}/bulten/ayril?token=${unsubscribeToken(subscriber.id)}`,
    })),
    total,
    active,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / 50)),
  };
}

export async function disableSubscriber(context: Context, rawId: string) {
  const admin = requireAdmin(context);
  const subscriberId = id.parse(rawId);
  await context.db.$transaction([
    context.db.subscriber.update({
      where: { id: subscriberId },
      data: { active: false, unsubscribedAt: new Date() },
    }),
    context.db.auditLog.create({
      data: { actorId: admin.id, action: "SUBSCRIBER_DISABLED", entityId: subscriberId },
    }),
  ]);
  return true;
}

export async function unsubscribe(context: Context, token: string) {
  if (token.length > 200) fail("Abonelik bağlantısı geçersiz.");
  const [subscriberId, signature] = token.split(".");
  if (!subscriberId || !signature || !safeEqual(unsubscribeToken(subscriberId), token))
    fail("Abonelik bağlantısı geçersiz.");
  await context.db.subscriber.updateMany({
    where: { id: subscriberId },
    data: { active: false, unsubscribedAt: new Date() },
  });
  return true;
}
