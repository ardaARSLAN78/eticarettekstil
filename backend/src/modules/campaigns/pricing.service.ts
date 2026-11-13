import type { Database } from "../../core/prisma/index.js";
import { hashToken } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import type { StoreSettings } from "../settings/settings.dto.js";

type PricingDatabase = Pick<Database, "campaign" | "coupon" | "category" | "campaignRedemption">;
export interface PricingLine {
  variantId: string;
  productId: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
  taxRateBps: number;
}

export function allocateDiscount(amount: number, gross: number[]) {
  const total = gross.reduce((sum, n) => sum + n, 0);
  if (!amount || !total) return gross.map(() => 0);
  const exact = gross.map((n) => (amount * n) / total);
  const parts = exact.map(Math.floor);
  let remainder = amount - parts.reduce((sum, n) => sum + n, 0);
  const order = exact
    .map((n, i) => ({ i, fraction: n - parts[i]! }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (const { i } of order) {
    if (!remainder) break;
    parts[i] = parts[i]! + 1;
    remainder--;
  }
  return parts;
}

export async function calculateQuote(
  db: PricingDatabase,
  lines: PricingLine[],
  settings: StoreSettings,
  code?: string | null,
  customerEmail?: string,
  strictCoupon = false,
) {
  const now = new Date();
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const include = { products: { select: { id: true } }, categories: { select: { id: true } } };
  const coupon = code
    ? await db.coupon.findUnique({ where: { code }, include: { campaign: { include } } })
    : null;
  const campaigns = code
    ? coupon?.active
      ? [coupon.campaign]
      : []
    : await db.campaign.findMany({
        where: { automatic: true, active: true, startsAt: { lte: now }, endsAt: { gt: now } },
        include,
        take: 100,
        orderBy: { id: "asc" },
      });
  const categories = await db.category.findMany({ select: { id: true, parentId: true } });
  const parents = new Map(categories.map((c) => [c.id, c.parentId]));
  let best: {
    campaignId: string;
    couponId: string | null;
    name: string;
    amount: number;
    eligible: number[];
  } | null = null;

  for (const campaign of campaigns) {
    if (
      !campaign.active ||
      campaign.startsAt > now ||
      campaign.endsAt <= now ||
      subtotal < campaign.minimumSubtotal
    )
      continue;
    if (
      campaign.usageLimit != null &&
      (await db.campaignRedemption.count({ where: { campaignId: campaign.id } })) >=
        campaign.usageLimit
    )
      continue;
    if (
      customerEmail &&
      campaign.perEmailLimit != null &&
      (await db.campaignRedemption.count({
        where: { campaignId: campaign.id, emailHash: hashToken(customerEmail.toLowerCase()) },
      })) >= campaign.perEmailLimit
    )
      continue;
    if (
      coupon?.usageLimit != null &&
      (await db.campaignRedemption.count({ where: { couponId: coupon.id } })) >= coupon.usageLimit
    )
      continue;
    const productIds = new Set(campaign.products.map((p) => p.id));
    const categoryIds = new Set(campaign.categories.map((c) => c.id));
    const eligible = lines.map((line) => {
      let category: string | null | undefined = line.categoryId;
      const visited = new Set<string>();
      let match = false;
      while (category && !visited.has(category)) {
        visited.add(category);
        if (categoryIds.has(category)) match = true;
        category = parents.get(category);
      }
      const qualifies =
        (!productIds.size && !categoryIds.size) || productIds.has(line.productId) || match;
      return qualifies ? line.unitPrice * line.quantity : 0;
    });
    const eligibleSubtotal = eligible.reduce((sum, n) => sum + n, 0);
    let amount =
      campaign.type === "PERCENTAGE"
        ? Math.floor((eligibleSubtotal * campaign.value) / 10000)
        : campaign.value;
    amount = Math.max(
      0,
      Math.min(amount, eligibleSubtotal, campaign.maximumDiscount ?? eligibleSubtotal),
    );
    if (amount && (!best || amount > best.amount))
      best = {
        campaignId: campaign.id,
        couponId: coupon?.id ?? null,
        name: campaign.name,
        amount,
        eligible,
      };
  }
  if (code && !best && strictCoupon)
    fail(
      "Kupon geçersiz, süresi dolmuş veya sepetiniz kullanım koşullarını karşılamıyor.",
      "INVALID_COUPON",
    );
  const discountAmount = best?.amount ?? 0;
  const allocated = allocateDiscount(discountAmount, best?.eligible ?? lines.map(() => 0));
  const pricedLines = lines.map((line, i) => ({
    ...line,
    discountAmount: allocated[i] ?? 0,
    taxAmount: Math.round(
      ((line.unitPrice * line.quantity - (allocated[i] ?? 0)) * line.taxRateBps) /
        (10000 + line.taxRateBps),
    ),
  }));
  const shipping =
    subtotal === 0 || subtotal - discountAmount >= settings.freeShippingThreshold
      ? 0
      : settings.shippingFee;
  const taxAmount =
    pricedLines.reduce((sum, line) => sum + line.taxAmount, 0) +
    Math.round((shipping * settings.shippingVatRateBps) / (10000 + settings.shippingVatRateBps));
  return {
    subtotal,
    discountAmount,
    shipping,
    taxAmount,
    total: subtotal - discountAmount + shipping,
    campaign: best,
    lines: pricedLines,
    couponCode: code ?? null,
    couponError: code && !best ? "Kupon artık uygulanamıyor." : null,
  };
}
