import { prisma } from "../dist/core/prisma/index.js";
import { defaultSettings } from "../dist/modules/settings/settings.dto.js";

// Başlangıç sözlükleri bir kere oluşturulur; mağazanın düzenlenmiş verileri ezilmez.
try {
  const initialized = await prisma.setting.findUnique({ where: { id: "bootstrap-v1" } });
  if (!initialized) {
    for (const [sortOrder, [name, slug, hex]] of [
      ["Ekru", "ekru", "#e8e1d4"],
      ["Taş", "tas", "#a79882"],
      ["Orman yeşili", "orman-yesili", "#263f32"],
      ["Lacivert", "lacivert", "#252e3b"],
      ["Kahve", "kahve", "#5d4434"],
      ["Siyah", "siyah", "#292827"],
    ].entries())
      await prisma.color.upsert({
        where: { slug },
        update: {},
        create: { name, slug, hex, sortOrder },
      });
    for (const [group, codes] of [
      ["CLOTHING", ["XS", "S", "M", "L", "XL", "XXL"]],
      ["FOOTWEAR", ["40", "41", "42", "43", "44", "45"]],
    ]) {
      for (const [sortOrder, code] of codes.entries())
        await prisma.size.upsert({
          where: { group_code: { group, code } },
          update: {},
          create: { group, code, label: group === "FOOTWEAR" ? `EU ${code}` : code, sortOrder },
        });
    }
    for (const [sortOrder, [slug, name, image]] of [
      ["pololar", "Polo & Tişört", "polo"],
      ["gomlekler", "Gömlek", "shirt"],
      ["pantolonlar", "Pantolon", "trousers"],
      ["ceketler", "Ceket & Blazer", "blazer"],
      ["trikolar", "Triko", "knit"],
      ["ayakkabilar", "Ayakkabı", "loafers"],
    ].entries())
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { slug, name, image: `/media/${image}.png`, sortOrder },
      });
    await prisma.brand.upsert({
      where: { slug: "quantia" },
      update: {},
      create: { slug: "quantia", name: "Quantia" },
    });
    await prisma.collection.upsert({
      where: { slug: "zamansiz-secki" },
      update: {},
      create: { slug: "zamansiz-secki", name: "Zamansız seçki", image: "/media/quantia-hero.png" },
    });
    await prisma.setting.upsert({
      where: { id: "storefront" },
      update: {},
      create: { id: "storefront", data: defaultSettings },
    });
    await prisma.setting.create({ data: { id: "bootstrap-v1", data: { completed: true } } });
  }
  // Panelde e-postası değiştirilmiş yöneticinin yerine yeni bir yönetici üretilmez.
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!existingAdmin) await import("./create-admin.mjs");
  console.log(
    "Başlangıç kategori, renk, beden, marka ve mağaza ayarları hazır. Ürün ve ödeme verileri değiştirilmedi.",
  );
} finally {
  await prisma.$disconnect();
}
