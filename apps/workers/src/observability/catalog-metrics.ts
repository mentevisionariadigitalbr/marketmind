/** Métricas específicas de sincronização de catálogo (além das de job). */
export const CATALOG_METRIC = {
  PRODUCTS_SYNCED: 'products_synced_total',
  INVENTORY_UPDATES: 'inventory_updates_total',
  PRICE_UPDATES: 'price_updates_total',
  CATALOG_DURATION: 'catalog_sync_duration_ms',
  CATALOG_FAILURES: 'catalog_sync_failures_total',
  CATEGORY_DURATION: 'category_sync_duration_ms',
} as const;

/** Extrai o id do item de um resource do ML (ex.: "/items/MLB123" -> "MLB123"). */
export function itemIdFromResource(resource?: string): string | null {
  if (!resource) return null;
  const match = resource.match(/\/items\/([^/?]+)/);
  return match ? match[1] : null;
}
