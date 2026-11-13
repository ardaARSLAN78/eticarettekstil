import { Prisma } from "../../generated/prisma/client.js";
import type { Context } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { getSettings } from "../settings/settings.service.js";
import { adjustCartItemDto, setCartItemDto } from "./carts.dto.js";
import { getCartIdentity } from "./carts.identity.js";
export { getCartIdentity } from "./carts.identity.js";
import { calculateQuote } from "../campaigns/pricing.service.js";
import { cartInclude, toPricingLines } from "./carts.includes.js";

export async function getCart(context: Context, knownId?: string) {
  const cartId = knownId ?? (await getCartIdentity(context));
  const [cart, settings] = await Promise.all([
    context.db.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude }),
    getSettings(context.db),
  ]);
  const items = cart.items.map(({ id, variantId, quantity, variant: v }) => ({
    id,
    variantId,
    quantity,
    name: v.product.name,
    slug: v.product.slug,
    image: v.product.media[0]?.url ?? "",
    color: v.colorInfo.name,
    colorHex: v.colorInfo.hex,
    size: v.sizeInfo.code,
    stock: v.stock,
    unitPrice: v.price ?? v.product.price,
    lineTotal: quantity * (v.price ?? v.product.price),
    available: v.active && v.product.active && v.product.category.active && v.stock >= quantity,
  }));
  const quote = await calculateQuote(
    context.db,
    toPricingLines(cart.items),
    settings,
    cart.couponCode,
    context.user?.email,
  );
  return {
    id: cartId,
    version: cart.version,
    items,
    ...quote,
    campaignName: quote.campaign?.name ?? null,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    freeShippingThreshold: settings.freeShippingThreshold,
  };
}

export async function setCartItem(context: Context, raw: unknown) {
  const input = setCartItemDto.parse(raw);
  return mutateItem(context, input);
}

export async function adjustCartItem(context: Context, raw: unknown) {
  const input = adjustCartItemDto.parse(raw);
  return mutateItem(context, input);
}

async function mutateItem(
  context: Context,
  input: { variantId: string; quantity?: number; delta?: number; expectedVersion?: number },
) {
  const cartId = await getCartIdentity(context);
  await context.db.$transaction(async (tx) => {
    // Aynı sepetten gelen paralel ekleme/ödeme işlemleri sıraya alınır.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`);
    const cart = await tx.cart.findUniqueOrThrow({ where: { id: cartId } });
    if (input.expectedVersion != null && cart.version !== input.expectedVersion) {
      fail(
        "Sepet başka bir sekmede değişti. Güncel sepet yüklendi; işleminizi yeniden yapın.",
        "CONFLICT",
      );
    }
    const where = { cartId_variantId: { cartId, variantId: input.variantId } };
    const existing = await tx.cartItem.findUnique({ where });
    const quantity =
      input.delta == null ? input.quantity! : Math.max(0, (existing?.quantity ?? 0) + input.delta);
    if (quantity > 10) fail("Bir varyanttan en fazla 10 adet eklenebilir.");
    await tx.cart.update({ where: { id: cartId }, data: { version: { increment: 1 } } });
    if (quantity === 0) {
      await tx.cartItem.deleteMany({ where: { cartId, variantId: input.variantId } });
      return;
    }
    const variant = await tx.variant.findUnique({
      where: { id: input.variantId },
      include: { product: { include: { category: true } } },
    });
    if (!variant || !variant.active || !variant.product.active || !variant.product.category.active)
      fail("Bu ürün satışa açık değil.");
    if (variant.stock < quantity) fail("Seçtiğiniz beden için yeterli stok yok.", "OUT_OF_STOCK");
    if (!existing && (await tx.cartItem.count({ where: { cartId } })) >= 20)
      fail("Sepetinize en fazla 20 farklı ürün ekleyebilirsiniz.");
    await tx.cartItem.upsert({
      where,
      create: { cartId, variantId: input.variantId, quantity },
      update: { quantity },
    });
  });
  return getCart(context, cartId);
}
