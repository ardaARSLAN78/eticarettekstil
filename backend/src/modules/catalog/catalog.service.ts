import { Prisma } from "../../generated/prisma/client.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { id } from "../../core/sanitizer/index.js";
import { fail } from "../../lib/errors.js";
import { categoryDto, filterDto, productDto } from "./catalog.dto.js";
import { productInclude, variantInclude } from "./catalog.includes.js";

export async function listProducts(context: Context, raw: unknown, admin = false) {
  if (admin) requireAdmin(context);
  const filter = filterDto.parse(raw ?? {});
  const where: Prisma.ProductWhereInput = {
    ...(!admin ? { active: true, category: { active: true } } : {}),
    ...(filter.featured != null ? { featured: filter.featured } : {}),
    ...(filter.category
      ? { category: { slug: filter.category, ...(!admin ? { active: true } : {}) } }
      : {}),
    ...(filter.collection
      ? { collections: { some: { slug: filter.collection, active: true } } }
      : {}),
    ...(filter.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { subtitle: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    filter.sort === "PRICE_ASC"
      ? [{ price: "asc" }, { id: "asc" }]
      : filter.sort === "PRICE_DESC"
        ? [{ price: "desc" }, { id: "asc" }]
        : filter.sort === "NEWEST"
          ? [{ createdAt: "desc" }, { id: "asc" }]
          : [{ featured: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  const [items, total] = await context.db.$transaction([
    context.db.product.findMany({
      where,
      orderBy,
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: {
        ...productInclude,
        variants: {
          include: variantInclude,
          where: admin ? {} : { active: true },
          orderBy: { id: "asc" },
        },
      },
    }),
    context.db.product.count({ where }),
  ]);
  return { items, total, page: filter.page, pages: Math.max(1, Math.ceil(total / filter.limit)) };
}

export async function saveCategory(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id: categoryId, ...data } = categoryDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    await tx.$executeRaw`LOCK TABLE "Category" IN SHARE ROW EXCLUSIVE MODE`;
    let parent = data.parentId;
    const visited = new Set<string>();
    while (parent) {
      if (parent === categoryId || visited.has(parent)) fail("Kategori kendi altına taşınamaz.");
      visited.add(parent);
      const ancestor = await tx.category.findUnique({
        where: { id: parent },
        select: { parentId: true },
      });
      if (!ancestor) fail("Üst kategori bulunamadı.");
      parent = ancestor.parentId;
    }
    const category = categoryId
      ? await tx.category.update({ where: { id: categoryId }, data })
      : await tx.category.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "CATEGORY_SAVED", entityId: category.id },
    });
    return category;
  });
}

export async function deleteCategory(context: Context, raw: string) {
  const admin = requireAdmin(context);
  const categoryId = id.parse(raw);
  return context.db.$transaction(async (tx) => {
    if (await tx.product.count({ where: { categoryId } }))
      fail("Bu kategoride ürün var. Önce ürünleri başka kategoriye taşıyın.");
    if (await tx.category.count({ where: { parentId: categoryId } }))
      fail("Önce alt kategorileri taşıyın veya kaldırın.");
    await tx.category.delete({ where: { id: categoryId } });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "CATEGORY_DELETED", entityId: categoryId },
    });
    return true;
  });
}

export async function saveProduct(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const { id: productId, variants, images, collectionIds, ...data } = productDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    const previous = productId
      ? await tx.product.findUniqueOrThrow({ where: { id: productId } })
      : null;
    const write = { ...data, collections: { set: collectionIds.map((id) => ({ id })) } };
    const product = productId
      ? await tx.product.update({ where: { id: productId }, data: write })
      : await tx.product.create({
          data: { ...data, collections: { connect: collectionIds.map((id) => ({ id })) } },
        });
    if (previous && previous.slug !== product.slug) {
      const fromPath = `/urun/${previous.slug}`;
      const toPath = `/urun/${product.slug}`;
      await tx.redirect.deleteMany({ where: { fromPath: toPath } });
      await tx.redirect.updateMany({ where: { toPath: fromPath }, data: { toPath } });
      await tx.redirect.upsert({
        where: { fromPath },
        create: { fromPath, toPath },
        update: { toPath },
      });
    }
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productImage.createMany({
      data: images.map((image, index) => ({
        ...image,
        productId: product.id,
        alt: image.alt || product.name,
        sortOrder: index,
      })),
    });
    const retainedIds = variants.flatMap((v) => (v.id ? [v.id] : []));
    const owned = await tx.variant.count({
      where: { id: { in: retainedIds }, productId: product.id },
    });
    if (owned !== retainedIds.length || new Set(retainedIds).size !== retainedIds.length)
      fail("Varyant kimliği bu ürüne ait değil.");

    // Silmek yerine pasife alma, geçmiş sipariş ve mevcut sepet ilişkilerini korur.
    await tx.variant.updateMany({
      where: { productId: product.id, id: { notIn: retainedIds } },
      data: { active: false },
    });
    for (const { id: variantId, expectedVersion, ...variant } of variants) {
      if (variantId) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "Variant" WHERE id = ${variantId} FOR UPDATE`);
        const before = await tx.variant.findUniqueOrThrow({ where: { id: variantId } });
        if (expectedVersion == null || before.version !== expectedVersion)
          fail("Ürün stoğu başka bir işlemle değişti. Formu yenileyip tekrar deneyin.", "CONFLICT");
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "Warehouse" WHERE id = ${before.warehouseId} FOR SHARE`,
        );
        const warehouse = await tx.warehouse.findUniqueOrThrow({
          where: { id: before.warehouseId },
        });
        if (variant.stock > 0 && !warehouse.active)
          fail("Pasif depoya stok eklenemez. Önce depoyu etkinleştirin.");
        await tx.variant.update({
          where: { id: variantId },
          data: { ...variant, version: { increment: 1 } },
        });
        if (before.stock !== variant.stock)
          await tx.stockMovement.create({
            data: {
              variantId,
              delta: variant.stock - before.stock,
              reason: "ADJUSTMENT",
              warehouseId: before.warehouseId,
              actorId: admin.id,
              note: "Yönetim paneli stok düzenlemesi",
            },
          });
      } else {
        await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id = 'main' FOR SHARE`;
        const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { id: "main" } });
        if (variant.stock > 0 && !warehouse.active)
          fail("Yeni varyantlar için ana depoyu etkinleştirin.");
        const created = await tx.variant.create({ data: { ...variant, productId: product.id } });
        if (created.stock)
          await tx.stockMovement.create({
            data: {
              variantId: created.id,
              delta: created.stock,
              reason: "INITIAL",
              warehouseId: created.warehouseId,
              actorId: admin.id,
            },
          });
      }
    }
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "PRODUCT_SAVED", entityId: product.id },
    });
    return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude });
  });
}

export async function archiveProduct(context: Context, raw: string) {
  const admin = requireAdmin(context);
  const productId = id.parse(raw);
  await context.db.$transaction([
    context.db.product.update({ where: { id: productId }, data: { active: false } }),
    context.db.auditLog.create({
      data: { actorId: admin.id, action: "PRODUCT_ARCHIVED", entityId: productId },
    }),
  ]);
  return true;
}
