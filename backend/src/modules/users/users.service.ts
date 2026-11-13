import { Prisma } from "../../generated/prisma/client.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { enforceLimit } from "../../core/redis/index.js";
import { hashPassword, verifyPassword } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { createStaffDto, userAccessDto, userFilterDto } from "./users.dto.js";

export async function listUsers(context: Context, raw: unknown) {
  requireAdmin(context);
  const input = userFilterDto.parse(raw ?? {});
  const where = {
    ...(input.role ? { role: input.role } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    context.db.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, disabled: true, createdAt: true },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * 30,
      take: 30,
    }),
    context.db.user.count({ where }),
  ]);
  return { items, total, page: input.page, pages: Math.max(1, Math.ceil(total / 30)) };
}

async function verifyAdministrator(context: Context, password: string) {
  const admin = requireAdmin(context);
  await enforceLimit(`privileged:${admin.id}`, 8, 900);
  const stored = await context.db.user.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(password, stored.passwordHash)))
    fail("Yönetici şifresi doğrulanamadı.", "UNAUTHENTICATED");
  return admin;
}

export async function createStaff(context: Context, raw: unknown) {
  requireAdmin(context);
  const input = createStaffDto.parse(raw);
  const admin = await verifyAdministrator(context, input.currentPassword);
  if (await context.db.user.findUnique({ where: { email: input.email } }))
    fail("Bu e-posta zaten kayıtlı.");
  await context.db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: "ADMIN",
        passwordHash: await hashPassword(input.password),
      },
    });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "STAFF_CREATED", entityId: user.id },
    });
  });
  return true;
}

export async function updateUserAccess(context: Context, raw: unknown) {
  requireAdmin(context);
  const input = userAccessDto.parse(raw);
  const admin = await verifyAdministrator(context, input.currentPassword);
  await context.db.$transaction(async (tx) => {
    // İki yöneticinin eşzamanlı olarak son aktif yöneticiyi kaldırması engellenir.
    await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN' ORDER BY id FOR UPDATE`;
    const target = await tx.user.findUniqueOrThrow({ where: { id: input.id } });
    if (target.role === "ADMIN" && !target.disabled && (input.role !== "ADMIN" || input.disabled)) {
      const admins = await tx.user.count({ where: { role: "ADMIN", disabled: false } });
      if (admins <= 1) fail("Son aktif yöneticinin erişimi kaldırılamaz.");
    }
    await tx.user.update({
      where: { id: input.id },
      data: { role: input.role, disabled: input.disabled },
    });
    await tx.session.deleteMany({ where: { userId: input.id } });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "USER_ACCESS_UPDATED", entityId: input.id },
    });
  });
  return true;
}
