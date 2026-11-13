-- Uygulama doğrulaması atlansa bile parasal değer ve stok tutarlılığı veritabanında korunur.
ALTER TABLE "Product" ADD CONSTRAINT "product_money_check" CHECK ("price" > 0 AND ("compareAtPrice" IS NULL OR "compareAtPrice" > "price"));
ALTER TABLE "Product" ADD CONSTRAINT "product_tax_weight_check" CHECK ("vatRateBps" BETWEEN 0 AND 10000 AND "weightGrams" >= 0);
ALTER TABLE "Variant" ADD CONSTRAINT "variant_stock_check" CHECK ("stock" >= 0 AND "lowStockThreshold" >= 0 AND ("price" IS NULL OR "price" > 0));
ALTER TABLE "CartItem" ADD CONSTRAINT "cart_quantity_check" CHECK ("quantity" BETWEEN 1 AND 10);
ALTER TABLE "Order" ADD CONSTRAINT "order_total_check" CHECK ("subtotal" >= 0 AND "shipping" >= 0 AND "discountAmount" BETWEEN 0 AND "subtotal" AND "total" = "subtotal" - "discountAmount" + "shipping" AND "taxAmount" BETWEEN 0 AND "total");
ALTER TABLE "Order" ADD CONSTRAINT "order_provider_check" CHECK ("paymentProvider" IN ('DEMO', 'BANK_TRANSFER', 'IYZICO', 'PAYTR', 'STRIPE') AND ("paymentProvider" <> 'DEMO' OR "paymentSandbox" = true));
ALTER TABLE "OrderItem" ADD CONSTRAINT "order_item_money_check" CHECK ("quantity" > 0 AND "unitPrice" > 0 AND "discountAmount" >= 0 AND "discountAmount" <= "unitPrice"::bigint * "quantity" AND "taxRateBps" BETWEEN 0 AND 10000 AND "taxAmount" >= 0);
ALTER TABLE "Campaign" ADD CONSTRAINT "campaign_rules_check" CHECK ("endsAt" > "startsAt" AND "value" > 0 AND ("type" <> 'PERCENTAGE' OR "value" <= 10000) AND "minimumSubtotal" >= 0 AND ("maximumDiscount" IS NULL OR "maximumDiscount" > 0) AND ("usageLimit" IS NULL OR "usageLimit" > 0) AND ("perEmailLimit" IS NULL OR "perEmailLimit" > 0));
ALTER TABLE "Coupon" ADD CONSTRAINT "coupon_usage_check" CHECK ("usageLimit" IS NULL OR "usageLimit" > 0);
ALTER TABLE "Category" ADD CONSTRAINT "category_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "StockMovement" ADD CONSTRAINT "stock_movement_delta_check" CHECK ("delta" <> 0);
CREATE UNIQUE INDEX "one_default_address_per_user" ON "CustomerAddress" ("userId") WHERE "isDefault" = true;
