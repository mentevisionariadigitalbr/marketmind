-- MarketMind AI — Cobrança (Fase 5, Inc.1): planos, assinaturas, faturas, uso.
-- plans é catálogo global (sem RLS). subscriptions/invoices/usage_records têm
-- dados de cliente => RLS por company (mesmo padrão das demais tabelas).

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'OPEN', 'FAILED', 'VOID');

-- ─────────────── plans (catálogo global) ───────────────
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "max_marketplace_accounts" INTEGER,
    "max_products" INTEGER,
    "history_window_days" INTEGER,
    "stripe_price_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
GRANT SELECT ON "plans" TO marketmind_app;

-- ─────────────── subscriptions (RLS) ───────────────
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "provider" TEXT,
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "trial_started_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscriptions_company_id_key" ON "subscriptions"("company_id");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "subscriptions" TO marketmind_app;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscriptions"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());

-- ─────────────── invoices (RLS) ───────────────
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" TEXT NOT NULL,
    "provider_invoice_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "payment_method" TEXT,
    "hosted_url" TEXT,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoices_provider_invoice_id_key" ON "invoices"("provider_invoice_id");
CREATE INDEX "invoices_company_id_issued_at_idx" ON "invoices"("company_id", "issued_at");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "invoices" TO marketmind_app;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());

-- ─────────────── usage_records (RLS) ───────────────
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "period_tag" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "usage_records_company_id_metric_period_tag_idx" ON "usage_records"("company_id", "metric", "period_tag");
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "usage_records" TO marketmind_app;
ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "usage_records"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
