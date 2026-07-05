-- MarketMind AI — Compras (Fase 1, Inc.4): pedidos de compra + itens.
-- Ao receber: ENTRADA no razão + custo médio ponderado. RLS por company.

CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED');

CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_id" UUID,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "expected_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_orders_company_id_status_idx" ON "purchase_orders"("company_id", "status");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_order_items_company_id_purchase_order_id_idx" ON "purchase_order_items"("company_id", "purchase_order_id");

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "purchase_orders" TO marketmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "purchase_order_items" TO marketmind_app;

ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_orders"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());

ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_order_items"
  USING (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company())
  WITH CHECK (coalesce(app_current_company(), '') = '' OR "company_id"::text = app_current_company());
