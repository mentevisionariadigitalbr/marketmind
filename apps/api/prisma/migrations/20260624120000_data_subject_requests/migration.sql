-- MarketMind AI — Direitos do titular (Fase 6, Inc.3). Registro append-only de
-- pedidos de exportação/exclusão (quem pediu, quando, tipo, escopo). RLS por company.

CREATE TYPE "DataSubjectRequestType" AS ENUM ('EXPORT', 'DELETION');
CREATE TYPE "DataSubjectRequestScope" AS ENUM ('USER', 'COMPANY');

CREATE TABLE "data_subject_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "scope" "DataSubjectRequestScope" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "data_subject_requests_company_id_created_at_idx" ON "data_subject_requests"("company_id", "created_at");

GRANT SELECT, INSERT, UPDATE, DELETE ON "data_subject_requests" TO marketmind_app;

ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "data_subject_requests"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
