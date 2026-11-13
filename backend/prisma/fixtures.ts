import type { Database } from "../src/core/prisma/index.js";
import { hashPassword } from "../src/lib/crypto.js";
import { defaultSettings } from "../src/modules/settings/settings.dto.js";

export async function seedCatalog(db: Database) {
  const colorRows = [
    { name: "Ekru", slug: "ekru", hex: "#e8e1d4" },
    { name: "Taş", slug: "tas", hex: "#a79882" },
    { name: "Orman yeşili", slug: "orman-yesili", hex: "#263f32" },
    { name: "Lacivert", slug: "lacivert", hex: "#252e3b" },
    { name: "Kahve", slug: "kahve", hex: "#5d4434" },
    { name: "Siyah", slug: "siyah", hex: "#292827" },
  ];
  for (const [sortOrder, color] of colorRows.entries())
    await db.color.upsert({
      where: { slug: color.slug },
      update: {},
      create: { ...color, sortOrder },
    });
  for (const [sortOrder, code] of ["XS", "S", "M", "L", "XL", "XXL"].entries())
    await db.size.upsert({
      where: { group_code: { group: "CLOTHING", code } },
      update: {},
      create: { code, label: code, group: "CLOTHING", sortOrder },
    });
  for (const [sortOrder, code] of ["40", "41", "42", "43", "44", "45"].entries())
    await db.size.upsert({
      where: { group_code: { group: "FOOTWEAR", code } },
      update: {},
      create: { code, label: `EU ${code}`, group: "FOOTWEAR", sortOrder },
    });
  const brand = await db.brand.upsert({
    where: { slug: "quantia" },
    update: {},
    create: {
      name: "Quantia",
      slug: "quantia",
      description: "Zamana değil, kendine ait. Klasik erkek giyiminde incelikli bir seçki.",
    },
  });
  const collection = await db.collection.upsert({
    where: { slug: "zamansiz-secki" },
    update: {},
    create: {
      name: "Zamansız seçki",
      slug: "zamansiz-secki",
      description: "İyi bir gardırobun değişmeyen parçaları.",
      image: "/media/quantia-hero.png",
      seoTitle: "Zamansız Erkek Giyim Seçkisi | Quantia",
      seoDescription:
        "Doğal dokular, sade çizgiler. Quantia klasik erkek giyim seçkisini keşfedin.",
    },
  });
  const categories = [
    { slug: "pololar", name: "Polo & Tişört", image: "/media/polo.png" },
    { slug: "gomlekler", name: "Gömlek", image: "/media/shirt.png" },
    { slug: "pantolonlar", name: "Pantolon", image: "/media/trousers.png" },
    { slug: "ceketler", name: "Ceket & Blazer", image: "/media/blazer.png" },
    { slug: "trikolar", name: "Triko", image: "/media/knit.png" },
    { slug: "ayakkabilar", name: "Ayakkabı", image: "/media/loafers.png" },
  ];
  for (const [sortOrder, category] of categories.entries())
    await db.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        ...category,
        sortOrder,
        seoTitle: `${category.name} | Quantia`,
        seoDescription: `Quantia ${category.name.toLocaleLowerCase("tr")} koleksiyonunu keşfedin. Zamansız klasik erkek giyimi.`,
      },
    });
  const rows = [
    {
      slug: "riviera-orgu-polo",
      name: "Riviera Örgü Polo",
      subtitle: "%100 pamuk · Regular fit",
      category: "pololar",
      image: "polo",
      price: 189000,
      old: null,
      material: "%100 uzun elyaf pamuk",
      colors: ["ekru", "orman-yesili", "lacivert"],
      badge: "YENİ SEZON",
    },
    {
      slug: "como-keten-gomlek",
      name: "Como Keten Gömlek",
      subtitle: "Saf keten · Rahat kesim",
      category: "gomlekler",
      image: "shirt",
      price: 229000,
      old: null,
      material: "%100 keten",
      colors: ["tas", "ekru"],
      badge: null,
    },
    {
      slug: "firenze-pileli-pantolon",
      name: "Firenze Pileli Pantolon",
      subtitle: "Yün karışımı · Tailored fit",
      category: "pantolonlar",
      image: "trousers",
      price: 249000,
      old: 299000,
      material: "%55 yün, %43 polyester, %2 elastan",
      colors: ["tas", "kahve", "siyah"],
      badge: "SEÇKİ",
    },
    {
      slug: "milano-yapisiz-blazer",
      name: "Milano Yapısız Blazer",
      subtitle: "Yumuşak dokulu · İki düğme",
      category: "ceketler",
      image: "blazer",
      price: 489000,
      old: null,
      material: "%80 yün, %20 poliamid",
      colors: ["kahve", "lacivert"],
      badge: "YENİ SEZON",
    },
    {
      slug: "siena-suet-loafer",
      name: "Siena Süet Loafer",
      subtitle: "Hakiki süet · Deri taban",
      category: "ayakkabilar",
      image: "loafers",
      price: 329000,
      old: null,
      material: "Dış yüzey: hakiki süet. İç astar: deri.",
      colors: ["kahve", "siyah"],
      badge: null,
    },
    {
      slug: "oxford-merinos-triko",
      name: "Oxford Merinos Triko",
      subtitle: "İnce örgü · Bisiklet yaka",
      category: "trikolar",
      image: "knit",
      price: 219000,
      old: null,
      material: "%100 merinos yünü",
      colors: ["orman-yesili", "ekru", "lacivert"],
      badge: null,
    },
  ];
  for (const [index, row] of rows.entries()) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: row.category } });
    const product = await db.product.upsert({
      where: { slug: row.slug },
      update: {},
      create: {
        slug: row.slug,
        name: row.name,
        subtitle: row.subtitle,
        description: `${row.name}, günün ritmine uyum sağlayan sade bir klasik. Özenle seçilen doğal dokusu ve dengeli kesimiyle gündelik şıklığı zahmetsiz kılar. Quantia'nın zamansız gardırop yaklaşımını yansıtan bu parça, tek başına ya da katmanlı kombinlerde kullanılabilir.`,
        material: row.material,
        care: "Bakım etiketindeki talimatlara uyun. Hassas programda yıkayın veya ürün etiketine uygun profesyonel temizlik uygulayın.",
        price: row.price,
        compareAtPrice: row.old,
        categoryId: category.id,
        brandId: brand.id,
        featured: true,
        badge: row.badge,
        seoTitle: `${row.name} | Quantia`,
        seoDescription: `${row.subtitle}. ${row.name} ile zamansız bir stil. Quantia erkek giyim koleksiyonunu keşfedin.`,
        // Vergi oranları işletme tarafından doğrulanıp panelden girilir; örnek veride oran sıfırdır.
        vatRateBps: 0,
        weightGrams: row.category === "ayakkabilar" ? 900 : 350,
        collections: { connect: { id: collection.id } },
        media: {
          create: {
            url: `/media/${row.image}.png`,
            alt: `${row.name} — örnek ürün fotoğrafı`,
            sortOrder: 0,
          },
        },
      },
    });
    const sizes = await db.size.findMany({
      where: { group: row.category === "ayakkabilar" ? "FOOTWEAR" : "CLOTHING" },
      orderBy: { sortOrder: "asc" },
    });
    for (const colorSlug of row.colors) {
      const color = await db.color.findUniqueOrThrow({ where: { slug: colorSlug } });
      for (const size of sizes) {
        const sku = `Q${String(index + 1).padStart(3, "0")}-${colorSlug.toUpperCase()}-${size.code}`;
        const variant = await db.variant.upsert({
          where: { sku },
          update: {},
          create: { productId: product.id, colorId: color.id, sizeId: size.id, sku, stock: 12 },
        });
        if (!(await db.stockMovement.findFirst({ where: { variantId: variant.id } })))
          await db.stockMovement.create({
            data: {
              variantId: variant.id,
              delta: variant.stock,
              reason: "INITIAL",
              note: "Örnek katalog başlangıç stoğu",
            },
          });
      }
    }
  }
  await db.setting.upsert({
    where: { id: "storefront" },
    update: {},
    create: { id: "storefront", data: defaultSettings },
  });
  const campaign = await db.campaign.upsert({
    where: { slug: "hos-geldiniz" },
    update: {},
    create: {
      name: "Quantia'ya hoş geldiniz",
      slug: "hos-geldiniz",
      description: "1.000 TL üzeri ilk alışverişte %10 indirim.",
      type: "PERCENTAGE",
      value: 1000,
      minimumSubtotal: 100000,
      maximumDiscount: 100000,
      active: true,
      automatic: false,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2027-12-31T23:59:59Z"),
      perEmailLimit: 1,
    },
  });
  await db.coupon.upsert({
    where: { code: "QUANTIA10" },
    update: {},
    create: { code: "QUANTIA10", campaignId: campaign.id },
  });
}

export async function seedAdmin(db: Database, email: string, password: string) {
  if (password.length < 12) throw new Error("Yönetici şifresi en az 12 karakter olmalıdır.");
  return db.user.upsert({
    where: { email },
    update: {},
    create: {
      email: email.toLowerCase(),
      name: "Quantia Yönetici",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
}
