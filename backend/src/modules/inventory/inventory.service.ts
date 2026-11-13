import { Prisma } from "../../generated/prisma/client.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { inventoryFilterDto, stockDto, warehouseDto } from "./inventory.dto.js";

export async function listInventory(context: Context, raw: unknown) {
  requireAdmin(context);
  const input = inventoryFilterDto.parse(raw ?? {});
  const where: Prisma.VariantWhereInput = {
    ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
    ...(input.lowOnly ? { stock: { lte: context.db.variant.fields.lowStockThreshold } } : {}),
    ...(input.search
      ? {
          OR: [
            { sku: { contains: input.search, mode: "insensitive" } },
            { product: { name: { contains: input.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    context.db.variant.findMany({
      where,
      skip: (input.page - 1) * 40,
      take: 40,
      orderBy: [{ stock: "asc" }, { id: "asc" }],
      include: {
        product: { select: { name: true, active: true } },
        colorInfo: true,
        sizeInfo: true,
        warehouse: true,
      },
    }),
    context.db.variant.count({ where }),
  ]);
  return {
    items: items.map((v) => ({
      id: v.id,
      name: v.product.name,
      sku: v.sku,
      color: v.colorInfo.name,
      size: v.sizeInfo.code,
      stock: v.stock,
      version: v.version,
      warehouseId: v.warehouseId,
      warehouse: v.warehouse.name,
      active: v.active && v.product.active,
      lowStockThreshold: v.lowStockThreshold,
    })),
    total,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / 40)),
  };
}

export async function updateInventory(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const input = stockDto.parse(raw);
  await context.db.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Variant" WHERE id = ${input.variantId} FOR UPDATE`,
    );
    const before = await tx.variant.findUniqueOrThrow({ where: { id: input.variantId } });
    if (before.version !== input.expectedVersion)
      fail("Stok başka bir işlemle değişti. Listeyi yenileyin.", "CONFLICT");
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Warehouse" WHERE id = ${input.warehouseId} FOR SHARE`,
    );
    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse?.active) fail("Etkin bir depo seçin.");
    const moving = before.warehouseId !== input.warehouseId;
    if (
      moving &&
      (await tx.orderItem.count({
        where: {
          variantId: before.id,
          order: {
            stockReleased: false,
            status: { in: ["PENDING_PAYMENT", "CONFIRMED", "PREPARING"] },
          },
        },
      }))
    )
      fail("Açık sipariş rezervasyonu bulunan varyantın deposu değiştirilemez.");
    await tx.variant.update({
      where: { id: before.id },
      data: { stock: input.stock, warehouseId: input.warehouseId, version: { increment: 1 } },
    });
    if (moving) {
      if (before.stock)
        await tx.stockMovement.create({
          data: {
            variantId: before.id,
            delta: -before.stock,
            reason: "ADJUSTMENT",
            warehouseId: before.warehouseId,
            actorId: admin.id,
            note: `Depo çıkışı: ${input.note}`,
          },
        });
      if (input.stock)
        await tx.stockMovement.create({
          data: {
            variantId: before.id,
            delta: input.stock,
            reason: "ADJUSTMENT",
            warehouseId: input.warehouseId,
            actorId: admin.id,
            note: `Depo girişi: ${input.note}`,
          },
        });
    } else if (input.stock !== before.stock) {
      await tx.stockMovement.create({
        data: {
          variantId: before.id,
          delta: input.stock - before.stock,
          reason: "ADJUSTMENT",
          warehouseId: before.warehouseId,
          actorId: admin.id,
          note: input.note,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: moving ? "INVENTORY_MOVED" : "INVENTORY_ADJUSTED",
        entityId: before.id,
      },
    });
  });
  return true;
}

export async function saveWarehouse(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id, ...input } = warehouseDto.parse(raw);
  await context.db.$transaction(async (tx) => {
    if (id) await tx.$queryRaw(Prisma.sql`SELECT id FROM "Warehouse" WHERE id = ${id} FOR UPDATE`);
    if (id && !input.active) {
      if (
        (await tx.variant.count({ where: { warehouseId: id, stock: { gt: 0 } } })) ||
        (await tx.orderItem.count({
          where: {
            warehouseId: id,
            order: {
              status: { in: ["PENDING_PAYMENT", "CONFIRMED", "PREPARING"] },
              stockReleased: false,
            },
          },
        }))
      )
        fail("Stok veya açık rezervasyon bulunan depo kapatılamaz.");
    }
    const row = id
      ? await tx.warehouse.update({ where: { id }, data: input })
      : await tx.warehouse.create({ data: input });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "WAREHOUSE_SAVED", entityId: row.id },
    });
  });
  return true;
}
