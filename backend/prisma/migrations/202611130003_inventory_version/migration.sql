-- Yönetim ekranında eski kalan stok formu yeni siparişin rezervasyonunu ezemez.
ALTER TABLE "Variant" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
