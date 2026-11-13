import { requireAdmin, type Context } from "../../graphql/context.js";
import { brandDto, collectionDto, colorDto, sizeDto } from "./taxonomy.dto.js";

export async function saveColor(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...data } = colorDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const row = id
      ? await tx.color.update({ where: { id }, data })
      : await tx.color.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "COLOR_SAVED", entityId: row.id },
    });
    return row;
  });
}
export async function saveSize(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...data } = sizeDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const row = id ? await tx.size.update({ where: { id }, data }) : await tx.size.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "SIZE_SAVED", entityId: row.id },
    });
    return row;
  });
}
export async function saveBrand(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...data } = brandDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const row = id
      ? await tx.brand.update({ where: { id }, data })
      : await tx.brand.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "BRAND_SAVED", entityId: row.id },
    });
    return row;
  });
}
export async function saveCollection(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...data } = collectionDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const row = id
      ? await tx.collection.update({ where: { id }, data })
      : await tx.collection.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "COLLECTION_SAVED", entityId: row.id },
    });
    return row;
  });
}
