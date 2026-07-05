-- MarketMind AI — Regras de imposto (Fase 2: DRE). Tenant-scoped via RLS (ADR-0002).

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "category" TEXT,
    "rate" DECIMAL(6,4) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_rules_company_id_regime_category_key" ON "tax_rules"("company_id", "regime", "category");
CREATE INDEX "tax_rules_company_id_idx" ON "tax_rules"("company_id");

-- ===========================================================================
-- Grant para a role de runtime + RLS (mesmo padrão do catálogo/custos/despesas).
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "tax_rules" TO marketmind_app;

ALTER TABLE "tax_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tax_rules"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
