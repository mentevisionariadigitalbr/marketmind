-- AlterTable
ALTER TABLE "products" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "last_synced_at" TIMESTAMPTZ(6),
ADD COLUMN     "listing_type" TEXT,
ADD COLUMN     "permalink" TEXT,
ADD COLUMN     "thumbnail" TEXT;

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "sku" TEXT,
    "gtin" TEXT,
    "color" TEXT,
    "size" TEXT,
    "price" DECIMAL(14,2),
    "available_quantity" INTEGER,
    "attributes" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_external_id" TEXT,
    "path_from_root" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_tree" (
    "id" UUID NOT NULL,
    "ancestor_external_id" TEXT NOT NULL,
    "child_external_id" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "category_tree_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_variants_company_id_idx" ON "product_variants"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_external_id_key" ON "product_variants"("product_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_variant_id_key" ON "inventory"("variant_id");

-- CreateIndex
CREATE INDEX "inventory_company_id_idx" ON "inventory"("company_id");

-- CreateIndex
CREATE INDEX "product_prices_company_id_product_id_captured_at_idx" ON "product_prices"("company_id", "product_id", "captured_at");

-- CreateIndex
CREATE INDEX "product_images_company_id_idx" ON "product_images"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_product_id_external_id_key" ON "product_images"("product_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_external_id_key" ON "categories"("external_id");

-- CreateIndex
CREATE INDEX "categories_parent_external_id_idx" ON "categories"("parent_external_id");

-- CreateIndex
CREATE INDEX "category_tree_child_external_id_idx" ON "category_tree"("child_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_tree_ancestor_external_id_child_external_id_key" ON "category_tree"("ancestor_external_id", "child_external_id");

-- CreateIndex
CREATE INDEX "products_company_id_last_synced_at_idx" ON "products"("company_id", "last_synced_at");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Grants para a role de runtime + RLS (ADR-0002).
-- categories e category_tree são catálogo GLOBAL (sem RLS); demais são tenant.
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "product_variants", "inventory", "product_prices", "product_images",
  "categories", "category_tree" TO marketmind_app;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_variants','inventory','product_prices','product_images']
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
