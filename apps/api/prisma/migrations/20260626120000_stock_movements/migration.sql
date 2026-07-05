-- MarketMind AI — Estoque operacional (Fase 1, Inc.1): razão de movimentações.
-- Append-only, rastreabilidade/conciliação (ML segue mestre do disponível). RLS por company.

CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'INVENTARIO', 'DEVOLUCAO');

CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,2),
    "reason" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_movements_company_id_product_id_occurred_at_idx" ON "stock_movements"("company_id", "product_id", "occurred_at");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "stock_movements" TO marketmind_app;

ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stock_movements"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
