import { MarketplaceCode } from './marketplace-code';

export interface SyncResult {
  imported: number;
  hasMore?: boolean;
  nextOffset?: number;
}

/** Capacidades opcionais que um marketplace pode suportar. */
export interface MarketplaceCapabilities {
  orders: boolean;
  catalog: boolean;
  inventory: boolean;
  price: boolean;
  categories: boolean;
  webhooks: boolean;
}

/**
 * Contrato uniforme que TODO marketplace (Mercado Livre, Shopee, Amazon, Magalu,
 * Custom/ERP) deve implementar. A plataforma fala só com esta interface — a
 * regra de negócio não conhece nenhuma API específica.
 */
export interface MarketplaceAdapter {
  readonly code: MarketplaceCode;
  readonly capabilities: MarketplaceCapabilities;

  syncOrders(input: { accountId: string; offset?: number }): Promise<SyncResult>;
  syncCatalog(input: { accountId: string; offset?: number }): Promise<SyncResult>;
  refreshAccount(input: { accountId: string }): Promise<void>;
}

/** Fábrica de adapters de um marketplace (resolve dependências do app). */
export interface MarketplaceProvider {
  readonly code: MarketplaceCode;
  createAdapter(): MarketplaceAdapter;
}
