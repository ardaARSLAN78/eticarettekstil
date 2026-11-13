import type { Database } from "../../core/prisma/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { defaultSettings, settingsDto } from "./settings.dto.js";

export async function getSettings(db: Database) {
  const row = await db.setting.findUnique({ where: { id: "storefront" } });
  return settingsDto.parse({ ...defaultSettings, ...((row?.data as object) ?? {}) });
}

export async function updateSettings(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const patch = settingsDto.partial().parse(raw);
  const data = settingsDto.parse({ ...(await getSettings(context.db)), ...patch });
  await context.db.$transaction([
    context.db.setting.upsert({
      where: { id: "storefront" },
      create: { id: "storefront", data },
      update: { data },
    }),
    context.db.auditLog.create({
      data: { actorId: admin.id, action: "SETTINGS_UPDATED", entityId: "storefront" },
    }),
  ]);
  return data;
}
