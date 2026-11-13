ALTER TABLE "User" ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscriber" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Subscriber" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);
CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");
INSERT INTO "Warehouse" ("id", "code", "name") VALUES ('main', 'ANA', 'Ana Depo');
ALTER TABLE "Variant" ADD COLUMN "warehouseId" TEXT NOT NULL DEFAULT 'main';
ALTER TABLE "StockMovement" ADD COLUMN "warehouseId" TEXT NOT NULL DEFAULT 'main';
ALTER TABLE "OrderItem" ADD COLUMN "warehouseId" TEXT NOT NULL DEFAULT 'main';
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Variant_warehouseId_active_idx" ON "Variant"("warehouseId", "active");
