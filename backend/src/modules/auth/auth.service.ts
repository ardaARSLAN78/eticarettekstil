import { cookieOptions } from "../../core/config/index.js";
import { enforceLimit } from "../../core/redis/index.js";
import type { Context } from "../../graphql/context.js";
import { hashPassword, hashToken, opaqueToken, verifyPassword } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { loginDto, registerDto } from "./auth.dto.js";
import { bindCartToAccount } from "../carts/carts.identity.js";

const week = 7 * 24 * 60 * 60;

async function establishSession(context: Context, userId: string) {
  await bindCartToAccount(context, userId);
  const token = opaqueToken();
  await context.db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + week * 1000) },
  });
  context.reply.cookie("quantia_session", token, { ...cookieOptions, maxAge: week * 1000 });
  context.reply.clearCookie("quantia_cart", cookieOptions);
  return context.db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function login(context: Context, raw: unknown) {
  const input = loginDto.parse(raw);
  await enforceLimit(`login:ip:${context.request.ip}`, 20, 900);
  await enforceLimit(`login:account:${hashToken(input.email)}`, 8, 900);
  const user = await context.db.user.findUnique({ where: { email: input.email } });
  // Olmayan hesapta da aynı maliyetle şifre türetilir; hesap varlığı zaman farkından anlaşılmaz.
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await hashPassword(input.password), false);
  if (!user || !valid || user.disabled) fail("E-posta veya şifre hatalı.", "UNAUTHENTICATED");
  return establishSession(context, user.id);
}

export async function register(context: Context, raw: unknown) {
  const input = registerDto.parse(raw);
  await enforceLimit(`register:${context.request.ip}`, 8, 3600);
  if (await context.db.user.findUnique({ where: { email: input.email } }))
    fail("Bu e-posta ile işlem yapılamıyor. Giriş yapmayı deneyin.");
  const user = await context.db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });
  return establishSession(context, user.id);
}

export async function logout(context: Context) {
  const token = context.request.cookies.quantia_session;
  if (token) await context.db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  context.reply.clearCookie("quantia_session", cookieOptions);
  context.reply.clearCookie("quantia_cart", cookieOptions);
  return true;
}
