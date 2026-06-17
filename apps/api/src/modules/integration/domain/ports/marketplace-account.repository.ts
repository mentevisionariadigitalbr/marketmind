export const MARKETPLACE_ACCOUNT_REPOSITORY = Symbol('MarketplaceAccountRepository');

export type MarketplaceAccountStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

export interface MarketplaceAccount {
  id: string;
  companyId: string;
  marketplaceId: string;
  externalUserId: string;
  nickname: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
  status: MarketplaceAccountStatus;
}

export interface UpsertAccountData {
  companyId: string;
  marketplaceId: string;
  externalUserId: string;
  nickname: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
}

export interface UpdateTokensData {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
  status?: MarketplaceAccountStatus;
}

export interface MarketplaceAccountRepository {
  findMarketplaceIdByCode(code: string): Promise<string | null>;
  findById(id: string): Promise<MarketplaceAccount | null>;
  /** Contas vinculadas a um vendedor ML (user_id do webhook). Cross-tenant. */
  findByExternalUserId(externalUserId: string): Promise<MarketplaceAccount[]>;
  /** Contas conectadas (para schedulers de refresh/health). Cross-tenant. */
  listConnected(): Promise<MarketplaceAccount[]>;
  /** Cria ou atualiza (reconexão) a conta — idempotente por (company, marketplace, externalUser). */
  upsert(data: UpsertAccountData): Promise<MarketplaceAccount>;
  updateTokens(id: string, data: UpdateTokensData): Promise<MarketplaceAccount>;
  markSynced(id: string, at: Date): Promise<void>;
}
