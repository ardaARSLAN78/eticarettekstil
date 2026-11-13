import { prisma } from "../dist/core/prisma/index.js";
import { hashPassword } from "../dist/lib/crypto.js";

try {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error("SEED_ADMIN_EMAIL ve en az 12 karakterli SEED_ADMIN_PASSWORD gereklidir.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error("Bu e-posta bir müşteri hesabına ait; otomatik yetki yükseltilmedi.");
    }

    console.log("Yönetici zaten mevcut. Şifre değiştirilmedi.");
  } else {
    await prisma.user.create({
      data: {
        email,
        name: "Quantia Yönetici",
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });

    console.log("Yönetici oluşturuldu.");
  }
} finally {
  await prisma.$disconnect();
}
