import type { Request, Response } from "express";
import type { Database } from "../core/prisma/index.js";
import type { User } from "../generated/prisma/client.js";
import { hashToken } from "../lib/crypto.js";
import { fail } from "../lib/errors.js";

export type PublicUser = Pick<User, "id" | "name" | "email" | "role">;

export interface Context {
  db: Database;
  request: Request;
  reply: Response;
  user: PublicUser | null;
}

export async function createContext(
  db: Database,
  request: Request,
  reply: Response,
): Promise<Context> {
  const token = request.cookies.quantia_session;
  let user: PublicUser | null = null;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const session = await db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, disabled: true } },
      },
    });
    if (session && session.expiresAt > new Date() && !session.user.disabled) user = session.user;
  }
  return { db, request, reply, user };
}

export function requireUser(context: Context): PublicUser {
  if (!context.user) fail("Bu işlem için giriş yapmalısınız.", "UNAUTHENTICATED");
  return context.user;
}

export function requireAdmin(context: Context): PublicUser {
  const user = requireUser(context);
  if (user.role !== "ADMIN") fail("Bu işlem için yönetici yetkisi gerekiyor.", "FORBIDDEN");
  return user;
}
