export const CATALOG_SYNC_REPOSITORY = Symbol('CatalogSyncRepository');

export interface NormalizedVariant {
  externalId: string;
  sku: string | null;
  gtin: string | null;
  color: string | null;
  size: string | null;
  price: number | null;
  availableQuantity: number;
  attributes: Record<string, unknown> | null;
}

export interface NormalizedImage {
  externalId: string;
  url: string;
  position: number;
}

export interface NormalizedProduct {
  companyId: string;
  marketplaceAccountId: string;
  externalId: string;
  sku: string | null;
  title: string;
  status: string;
  price: number | null;
  currency: string;
  availableQuantity: number;
  categoryId: string | null;
  permalink: string | null;
  thumbnail: string | null;
  listingType: string | null;
  variants: NormalizedVariant[];
  images: NormalizedImage[];
}

export interface NormalizedCategory {
  externalId: string;
  name: string;
  parentExternalId: string | null;
  pathFromRoot: Array<{ id: string; name: string }>;
}

export interface UpsertProductResult {
  created: boolean;
  priceChanged: boolean;
  variantCount: number;
}

export interface CatalogSyncRepository {
  /** Upsert idempotente: produto + variações + estoque + preço (histórico) + imagens. */
  upsertProduct(product: NormalizedProduct): Promise<UpsertProductResult>;
  /** Atualiza apenas estoque/preço de um produto (webhooks pontuais). */
  updateVariantStockAndPrice(input: {
    companyId: string;
    marketplaceAccountId: string;
    externalId: string;
    price: number | null;
    availableQuantity: number;
  }): Promise<{ found: boolean; priceChanged: boolean }>;
  /** Upsert idempotente de categoria + arestas da árvore (closure). */
  upsertCategory(category: NormalizedCategory): Promise<void>;
}
