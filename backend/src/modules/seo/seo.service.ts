import { requireAdmin, type Context } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { redirectDto } from "./seo.dto.js";

export async function seoEntries(context: Context) {
  const fields = {
    slug: true,
    updatedAt: true,
    seoTitle: true,
    seoDescription: true,
    canonicalUrl: true,
  };
  const [products, categories, collections] = await Promise.all([
    context.db.product.findMany({
      where: { active: true, noIndex: false, category: { active: true } },
      select: fields,
      take: 20000,
    }),
    context.db.category.findMany({
      where: { active: true, noIndex: false },
      select: fields,
      take: 5000,
    }),
    context.db.collection.findMany({
      where: { active: true, noIndex: false },
      select: fields,
      take: 5000,
    }),
  ]);
  return [
    ...products.map((p) => ({ ...p, path: `/urun/${p.slug}` })),
    ...categories.map((p) => ({ ...p, path: `/koleksiyon?kategori=${p.slug}` })),
    ...collections.map((p) => ({ ...p, path: `/koleksiyon?secim=${p.slug}` })),
  ].map((p) => ({
    path: p.path,
    updatedAt: p.updatedAt.toISOString(),
    title: p.seoTitle,
    description: p.seoDescription,
    canonicalUrl: p.canonicalUrl,
  }));
}

export async function saveRedirect(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const data = redirectDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    await tx.$executeRaw`LOCK TABLE "Redirect" IN SHARE ROW EXCLUSIVE MODE`;
    const visited = new Set([data.fromPath]);
    let current = data.toPath;
    for (let i = 0; i < 20; i++) {
      if (visited.has(current)) fail("Yönlendirme döngüsü oluşturulamaz.");
      visited.add(current);
      const next = await tx.redirect.findUnique({ where: { fromPath: current } });
      if (!next) break;
      current = next.toPath;
      if (i === 19) fail("Yönlendirme zinciri çok uzun.");
    }
    const row = await tx.redirect.upsert({
      where: { fromPath: data.fromPath },
      create: { ...data, toPath: current },
      update: { toPath: current },
    });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "REDIRECT_SAVED", entityId: row.id },
    });
    return row;
  });
}
