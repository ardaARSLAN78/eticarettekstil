import "dotenv/config";
import { prisma } from "../src/core/prisma/index.js";
import { seedAdmin, seedCatalog } from "./fixtures.js";

try {
  if (process.env.NODE_ENV !== "production") await seedCatalog(prisma);
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error("SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD tanımlanmalıdır.");
  await seedAdmin(prisma, email, password);
  console.log("Quantia başlangıç verisi hazır. Mevcut ürünler ve yönetici şifresi değiştirilmedi.");
} finally {
  await prisma.$disconnect();
}
