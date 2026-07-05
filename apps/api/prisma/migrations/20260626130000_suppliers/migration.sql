-- MarketMind AI — Fornecedores (Fase 1, Inc.2): cadastro + vínculo no produto.
-- RLS por company. lead_time_days alimenta a previsão de reposição (Inc.3).

CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "document" TEXT,
    "lead_time_days" INTEGER,
    "payment_term_days" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_company_id_active_idx" ON "suppliers"("company_id", "active");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vínculo produto → fornecedor (SET NULL ao remover o fornecedor).
ALTER TABLE "products" ADD COLUMN "supplier_id" UUID;
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "suppliers" TO marketmind_app;

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "suppliers"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
