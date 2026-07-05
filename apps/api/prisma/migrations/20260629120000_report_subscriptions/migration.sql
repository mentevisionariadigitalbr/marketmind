-- MarketMind AI — Relatórios por e-mail (Fase 3, Inc.3): assinatura por empresa.
-- RLS por company; o agendador lê cross-tenant com a GUC ausente (bootstrap).

CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY');

CREATE TABLE "report_subscriptions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'WEEKLY',
    "recipients" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_subscriptions_company_id_key" ON "report_subscriptions"("company_id");

ALTER TABLE "report_subscriptions" ADD CONSTRAINT "report_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "report_subscriptions" TO marketmind_app;

ALTER TABLE "report_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "report_subscriptions"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
