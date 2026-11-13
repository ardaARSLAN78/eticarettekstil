import { Prisma } from "../../generated/prisma/client.js";
import { cookieOptions } from "../../core/config/index.js";
import type { Context } from "../../graphql/context.js";
import { hashToken, opaqueToken } from "../../lib/crypto.js";

const month = 30 * 24 * 60 * 60;

function guestToken(context: Context) {
  const token: unknown = context.request.cookies.quantia_cart;
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function bindCartToAccount(context: Context, userId: string) {
  const token = guestToken(context);
  return context.db.$transaction(async (tx) => {
    // Aynı hesaba iki cihazdan girişte tek hesap sepeti oluşturulur.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`);
    const account = await tx.cart.findUnique({ where: { userId } });
    const guest = token
      ? await tx.cart.findUnique({ where: { tokenHash: hashToken(token) } })
      : null;
    const eligibleGuest = guest && !guest.userId && guest.expiresAt > new Date() ? guest : null;

    if (eligibleGuest) {
      const lockIds = [eligibleGuest.id, ...(account ? [account.id] : [])].sort();
      for (const cartId of lockIds) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "Cart" WHERE id = ${cartId} FOR UPDATE`);
      }

      // Kilit beklerken başka bir hesaba bağlanan sepet kopyalanamaz.
      const currentGuest = await tx.cart.findUniqueOrThrow({
        where: { id: eligibleGuest.id },
        include: { items: true },
      });
      if (!currentGuest.userId) {
        if (!account) {
          const adopted = await tx.cart.update({
            where: { id: currentGuest.id },
            data: { userId, version: { increment: 1 } },
          });
          return adopted.id;
        }

        for (const item of currentGuest.items) {
          const where = { cartId_variantId: { cartId: account.id, variantId: item.variantId } };
          const existing = await tx.cartItem.findUnique({ where });
          const quantity = Math.min(10, (existing?.quantity ?? 0) + item.quantity);
          await tx.cartItem.upsert({
            where,
            create: { cartId: account.id, variantId: item.variantId, quantity },
            update: { quantity },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: currentGuest.id } });
        await tx.cart.update({
          where: { id: currentGuest.id },
          data: { expiresAt: new Date(0), version: { increment: 1 } },
        });
        await tx.cart.update({
          where: { id: account.id },
          data: {
            couponCode: account.couponCode ?? currentGuest.couponCode,
            version: { increment: 1 },
          },
        });
      }
    }

    if (account) return account.id;
    const created = await tx.cart.create({
      data: {
        userId,
        tokenHash: hashToken(opaqueToken()),
        expiresAt: new Date(Date.now() + month * 1000),
      },
    });
    return created.id;
  });
}

export async function getCartIdentity(context: Context) {
  if (context.user) {
    const account = await context.db.cart.findUnique({
      where: { userId: context.user.id },
      select: { id: true },
    });
    return account?.id ?? bindCartToAccount(context, context.user.id);
  }

  const token = guestToken(context);
  if (token) {
    const cart = await context.db.cart.findUnique({ where: { tokenHash: hashToken(token) } });
    if (cart && !cart.userId && cart.expiresAt > new Date()) return cart.id;
  }

  const next = opaqueToken();
  const cart = await context.db.cart.create({
    data: { tokenHash: hashToken(next), expiresAt: new Date(Date.now() + month * 1000) },
  });
  context.reply.cookie("quantia_cart", next, { ...cookieOptions, maxAge: month * 1000 });
  return cart.id;
}
