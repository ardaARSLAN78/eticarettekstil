-- Üye sepeti tarayıcıdaki geçici duruma değil kullanıcı hesabına bağlıdır.
ALTER TABLE "Cart" ADD COLUMN "userId" TEXT;
ALTER TABLE "Cart" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "cart_version_check" CHECK ("version" >= 0);
