import { requireAdmin, type Context } from "../../graphql/context.js";
import { getCart, getCartIdentity } from "../carts/carts.service.js";
import { campaignDto, couponCode, couponDto } from "./campaigns.dto.js";
import { calculateQuote } from "./pricing.service.js";
import { cartInclude, toPricingLines } from "../carts/carts.includes.js";
import { getSettings } from "../settings/settings.service.js";
import { productInclude } from "../catalog/catalog.includes.js";
import { Prisma } from "../../generated/prisma/client.js";

export const campaignInclude = {
  products: { include: productInclude },
  categories: true,
  coupons: true,
};

export async function saveCampaign(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, productIds, categoryIds, ...data } = campaignDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const relations = {
      products: { set: productIds.map((id) => ({ id })) },
      categories: { set: categoryIds.map((id) => ({ id })) },
    };
    const row = id
      ? await tx.campaign.update({
          where: { id },
          data: { ...data, ...relations },
          include: campaignInclude,
        })
      : await tx.campaign.create({
          data: {
            ...data,
            products: { connect: productIds.map((id) => ({ id })) },
            categories: { connect: categoryIds.map((id) => ({ id })) },
          },
          include: campaignInclude,
        });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "CAMPAIGN_SAVED", entityId: row.id },
    });
    return row;
  });
}

export async function saveCoupon(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...data } = couponDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const row = id
      ? await tx.coupon.update({ where: { id }, data })
      : await tx.coupon.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "COUPON_SAVED", entityId: row.id },
    });
    return row;
  });
}

export async function applyCoupon(context: Context, raw: string) {
  const code = raw.trim() ? couponCode.parse(raw) : null;
  const cartId = await getCartIdentity(context);
  const settings = await getSettings(context.db);
  await context.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`);
    const cart = await tx.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
    if (code)
      await calculateQuote(
        tx,
        toPricingLines(cart.items),
        settings,
        code,
        context.user?.email,
        true,
      );
    await tx.cart.update({
      where: { id: cartId },
      data: { couponCode: code, version: { increment: 1 } },
    });
  });
  return getCart(context, cartId);
}
