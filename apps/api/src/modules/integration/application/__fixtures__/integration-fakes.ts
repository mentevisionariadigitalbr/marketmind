import {
  MarketplaceAccount,
  MarketplaceAccountRepository,
  UpdateTokensData,
  UpsertAccountData,
} from '../../domain/ports/marketplace-account.repository';
import {
  NormalizedOrder,
  OrderSyncRepository,
  UpsertOrderResult,
} from '../../domain/ports/order-sync.repository';
import {
  RecordWebhookData,
  WebhookEventRepository,
} from '../../domain/ports/webhook-event.repository';
import {
  MercadoLivreApi,
  MercadoLivreApiFactory,
  MercadoLivreOAuthPort,
  MlRawOrder,
  MlTokenSet,
} from '../../domain/ports/mercado-livre.port';

export class FakeMarketplaceAccountRepository implements MarketplaceAccountRepository {
  accounts: MarketplaceAccount[] = [];
  marketplaceId: string | null = 'mkt-ml';
  upsertCalls = 0;
  syncedAt?: Date;

  async findMarketplaceIdByCode(): Promise<string | null> {
    return this.marketplaceId;
  }
  async findById(id: string): Promise<MarketplaceAccount | null> {
    return this.accounts.find((a) => a.id === id) ?? null;
  }
  async findByExternalUserId(externalUserId: string): Promise<MarketplaceAccount[]> {
    return this.accounts.filter((a) => a.externalUserId === externalUserId);
  }
  async listConnected(): Promise<MarketplaceAccount[]> {
    return this.accounts.filter((a) => a.status === 'CONNECTED');
  }
  async upsert(data: UpsertAccountData): Promise<MarketplaceAccount> {
    this.upsertCalls += 1;
    const existing = this.accounts.find(
      (a) =>
        a.companyId === data.companyId &&
        a.marketplaceId === data.marketplaceId &&
        a.externalUserId === data.externalUserId,
    );
    const account: MarketplaceAccount = {
      id: existing?.id ?? `acc-${this.accounts.length + 1}`,
      status: 'CONNECTED',
      ...data,
    };
    if (existing) Object.assign(existing, account);
    else this.accounts.push(account);
    return account;
  }
  async updateTokens(id: string, data: UpdateTokensData): Promise<MarketplaceAccount> {
    const account = this.accounts.find((a) => a.id === id)!;
    Object.assign(account, data);
    return account;
  }
  async markSynced(_id: string, at: Date): Promise<void> {
    this.syncedAt = at;
  }
}

export class FakeOrderSyncRepository implements OrderSyncRepository {
  upserts: NormalizedOrder[] = [];
  async upsertOrder(order: NormalizedOrder): Promise<UpsertOrderResult> {
    const exists = this.upserts.some((o) => o.externalId === order.externalId);
    this.upserts.push(order);
    return { created: !exists };
  }
}

export class FakeWebhookEventRepository implements WebhookEventRepository {
  keys = new Set<string>();
  async recordIfNew(data: RecordWebhookData): Promise<boolean> {
    if (this.keys.has(data.dedupeKey)) return false;
    this.keys.add(data.dedupeKey);
    return true;
  }
  async markProcessed(): Promise<void> {}
}

export class FakeMlOAuth implements MercadoLivreOAuthPort {
  refreshCalls = 0;
  authorizationUrl(state?: string): string {
    return `https://auth.test/authorization?state=${state ?? ''}`;
  }
  async exchangeCode(code: string): Promise<MlTokenSet> {
    return { accessToken: `AT-${code}`, refreshToken: 'RT', expiresIn: 3600, obtainedAt: 1000, userId: 555, scope: '' };
  }
  async refresh(): Promise<MlTokenSet> {
    this.refreshCalls += 1;
    return { accessToken: 'AT-new', refreshToken: 'RT-new', expiresIn: 3600, obtainedAt: 2000, userId: 555, scope: '' };
  }
}

export class FakeMlApiFactory implements MercadoLivreApiFactory {
  lastToken?: string;
  orders: MlRawOrder[] = [];
  me = { id: 555, nickname: 'LOJA' };

  create(accessToken: string): MercadoLivreApi {
    this.lastToken = accessToken;
    return {
      getMe: async () => this.me,
      searchOrders: async () => ({
        results: this.orders,
        paging: { total: this.orders.length, offset: 0, limit: 50 },
      }),
    };
  }
}

export function sampleOrder(id: number, overrides: Partial<MlRawOrder> = {}): MlRawOrder {
  return {
    id,
    status: 'paid',
    date_created: '2026-06-10T12:00:00.000Z',
    total_amount: 100,
    currency_id: 'BRL',
    order_items: [
      { item: { id: 'MLB1', title: 'Produto', seller_sku: 'SKU-1' }, quantity: 1, unit_price: 100, sale_fee: 10 },
    ],
    buyer: { id: 999, nickname: 'COMPRADOR' },
    shipping: { cost: 15 },
    ...overrides,
  };
}
