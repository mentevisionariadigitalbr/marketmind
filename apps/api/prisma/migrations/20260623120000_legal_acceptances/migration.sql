-- MarketMind AI — Aceite legal versionado (Fase 6, Inc.1). Prova de consentimento
-- (Termos/Privacidade) com versão, data, ip e user-agent. RLS por company.

CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY');

CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_acceptances_user_id_document_type_idx" ON "legal_acceptances"("user_id", "document_type");
CREATE INDEX "legal_acceptances_company_id_idx" ON "legal_acceptances"("company_id");

ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant + RLS (mesmo padrão do projeto).
GRANT SELECT, INSERT, UPDATE, DELETE ON "legal_acceptances" TO marketmind_app;

ALTER TABLE "legal_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_acceptances" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "legal_acceptances"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
