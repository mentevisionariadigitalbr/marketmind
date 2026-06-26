-- MarketMind AI — Edição manual de produto (Fase 2, Inc.1).
-- Campos manuais (overrides internos); o sync do ML nunca os sobrescreve.

ALTER TABLE "products" ADD COLUMN "brand" TEXT;
ALTER TABLE "products" ADD COLUMN "internal_sku" TEXT;
ALTER TABLE "products" ADD COLUMN "internal_title" TEXT;
ALTER TABLE "products" ADD COLUMN "internal_notes" TEXT;
ALTER TABLE "products" ADD COLUMN "promo_price" DECIMAL(14,2);
