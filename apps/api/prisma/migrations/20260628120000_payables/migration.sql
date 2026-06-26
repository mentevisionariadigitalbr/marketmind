-- MarketMind AI — Fluxo de caixa (Fase 3, Inc.1): contas a pagar.
-- Geradas no recebimento de compra ou manuais. RLS por company.

CREATE TYPE "PayableStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "payables" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_id" UUID,
    "source_type" TEXT NOT NULL,
    "source_id" UUID,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payables_company_id_status_due_date_idx" ON "payables"("company_id", "status", "due_date");

ALTER TABLE "payables" ADD CONSTRAINT "payables_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "payables" TO marketmind_app;

ALTER TABLE "payables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payables" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payables"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
