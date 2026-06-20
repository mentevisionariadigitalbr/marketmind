-- MarketMind AI — Custos por produto/variante (Fase 1: Custos & Lucratividade)
-- Vigência por `valid_from` (custo histórico). Tenant-scoped via RLS (ADR-0002).

-- CreateTable
CREATE TABLE "product_costs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "sku" TEXT,
    "acquisition_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inbound_freight" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "packaging_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_costs_company_id_idx" ON "product_costs"("company_id");
CREATE INDEX "product_costs_company_id_product_id_valid_from_idx" ON "product_costs"("company_id", "product_id", "valid_from");
CREATE INDEX "product_costs_company_id_variant_id_valid_from_idx" ON "product_costs"("company_id", "variant_id", "valid_from");
CREATE INDEX "product_costs_company_id_sku_valid_from_idx" ON "product_costs"("company_id", "sku", "valid_from");

-- AddForeignKey
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Grant para a role de runtime + RLS (ADR-0002), mesmo padrão do catálogo.
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "product_costs" TO marketmind_app;

ALTER TABLE "product_costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_costs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "product_costs"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
