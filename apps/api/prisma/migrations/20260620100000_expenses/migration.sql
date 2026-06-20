-- MarketMind AI — Despesas operacionais (Fase 2: DRE). Tenant-scoped via RLS (ADR-0002).

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('FIXED', 'VARIABLE');
CREATE TYPE "ExpenseRecurrence" AS ENUM ('NONE', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "kind" "ExpenseKind" NOT NULL DEFAULT 'VARIABLE',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "recurrence" "ExpenseRecurrence" NOT NULL DEFAULT 'NONE',
    "starts_on" TIMESTAMPTZ(6) NOT NULL,
    "ends_on" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_company_id_idx" ON "expenses"("company_id");
CREATE INDEX "expenses_company_id_starts_on_idx" ON "expenses"("company_id", "starts_on");

-- ===========================================================================
-- Grant para a role de runtime + RLS (mesmo padrão do catálogo/custos).
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "expenses" TO marketmind_app;

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "expenses"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
