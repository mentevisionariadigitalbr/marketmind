-- CreateEnum
CREATE TYPE "MarketplaceCode" AS ENUM ('MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU');

-- CreateEnum
CREATE TYPE "MarketplaceAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "marketplaces" (
    "id" UUID NOT NULL,
    "code" "MarketplaceCode" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "marketplace_id" UUID NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "nickname" TEXT,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT NOT NULL,
    "token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "scope" TEXT,
    "status" "MarketplaceAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketplace_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "marketplace_account_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "price" DECIMAL(14,2),
    "available_quantity" INTEGER,
    "category_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "nickname" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "marketplace_account_id" UUID NOT NULL,
    "customer_id" UUID,
    "external_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'UNKNOWN',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "gross_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "freight_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ordered_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "external_item_id" TEXT NOT NULL,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "item_commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "source" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "queue" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "company_id" UUID,
    "data" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplaces_code_key" ON "marketplaces"("code");

-- CreateIndex
CREATE INDEX "marketplace_accounts_company_id_idx" ON "marketplace_accounts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_accounts_company_id_marketplace_id_external_use_key" ON "marketplace_accounts"("company_id", "marketplace_id", "external_user_id");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "products"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_marketplace_account_id_external_id_key" ON "products"("marketplace_account_id", "external_id");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_company_id_external_id_key" ON "customers"("company_id", "external_id");

-- CreateIndex
CREATE INDEX "orders_company_id_ordered_at_idx" ON "orders"("company_id", "ordered_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_marketplace_account_id_external_id_key" ON "orders"("marketplace_account_id", "external_id");

-- CreateIndex
CREATE INDEX "order_items_company_id_idx" ON "order_items"("company_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_dedupe_key_key" ON "webhook_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "webhook_events_company_id_received_at_idx" ON "webhook_events"("company_id", "received_at");

-- CreateIndex
CREATE INDEX "jobs_queue_status_idx" ON "jobs"("queue", "status");

-- CreateIndex
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");

-- AddForeignKey
ALTER TABLE "marketplace_accounts" ADD CONSTRAINT "marketplace_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_accounts" ADD CONSTRAINT "marketplace_accounts_marketplace_id_fkey" FOREIGN KEY ("marketplace_id") REFERENCES "marketplaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_marketplace_account_id_fkey" FOREIGN KEY ("marketplace_account_id") REFERENCES "marketplace_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketplace_account_id_fkey" FOREIGN KEY ("marketplace_account_id") REFERENCES "marketplace_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Grants para a role de runtime de menor privilégio + RLS (ADR-0002).
-- `marketplaces` é catálogo global (apenas leitura no runtime, sem RLS).
-- ===========================================================================
GRANT SELECT ON "marketplaces" TO marketmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "marketplace_accounts", "products", "customers", "orders", "order_items",
  "webhook_events", "jobs" TO marketmind_app;

-- RLS de isolamento por tenant (mesmo padrão das demais tabelas tenant-scoped).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'marketplace_accounts','products','customers','orders','order_items','webhook_events','jobs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
        WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
    $f$, t);
  END LOOP;
END
$$;
