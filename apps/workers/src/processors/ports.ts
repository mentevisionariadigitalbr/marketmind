/** Interfaces mínimas que os processors consomem — desacopla dos use cases da API. */

export interface AccountLike {
  id: string;
  companyId: string;
  externalUserId: string;
}

export interface AccountLookup {
  findById(id: string): Promise<AccountLike | null>;
  findByExternalUserId(externalUserId: string): Promise<AccountLike[]>;
  listConnected(): Promise<AccountLike[]>;
}

export interface OrderSyncRunner {
  execute(input: { accountId: string; limit?: number }): Promise<{
    imported: number;
    created: number;
    updated: number;
  }>;
}

export interface SessionRefresher {
  apiForAccount(account: AccountLike): Promise<unknown>;
}

export interface ProductSyncRunner {
  execute(input: { accountId: string; offset?: number; limit?: number }): Promise<{
    fetched: number;
    created: number;
    updated: number;
    priceChanges: number;
    hasMore: boolean;
    nextOffset: number;
    total: number;
  }>;
}

export interface ItemSyncRunner {
  execute(input: { accountId: string; itemId: string }): Promise<unknown>;
}

export interface CategorySyncRunner {
  execute(input: { accountId: string; categoryId: string }): Promise<unknown>;
}

/** Executa `fn` dentro do contexto de tenant (para o RLS valer no worker). */
export type WithTenant = <T>(companyId: string, fn: () => Promise<T>) => Promise<T>;
