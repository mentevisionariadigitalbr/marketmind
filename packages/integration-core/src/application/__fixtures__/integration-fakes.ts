import {
  MarketplaceAccount,
  MarketplaceAccountRepository,
  MarketplaceAccountSummary,
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
  MlRawCategory,
  MlRawItem,
  MlRawOrder,
  MlTokenSet,
} from '../../domain/ports/mercado-livre.port';
import {
  CatalogSyncRepository,
  NormalizedCategory,
  NormalizedProduct,
  UpsertProductResult,
} from '../../domain/ports/catalog-sync.repository';

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
  async listByCompany(companyId: string): Promise<MarketplaceAccountSummary[]> {
    return this.accounts
      .filter((a) => a.companyId === companyId)
      .map((a) => ({
        id: a.id,
        marketplaceCode: 'MERCADO_LIVRE',
        marketplaceName: 'Mercado Livre',
        externalUserId: a.externalUserId,
        nickname: a.nickname,
        status: a.status,
        tokenExpiresAt: a.tokenExpiresAt,
        lastSyncedAt: this.syncedAt ?? null,
      }));
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
  items: MlRawItem[] = [];
  itemsTotal?: number;
  category?: MlRawCategory;
  me = { id: 555, nickname: 'LOJA' };

  create(accessToken: string): MercadoLivreApi {
    this.lastToken = accessToken;
    return {
      getMe: async () => this.me,
      searchOrders: async () => ({
        results: this.orders,
        paging: { total: this.orders.length, offset: 0, limit: 50 },
      }),
      getItemIds: async (params) => ({
        results: this.items.map((i) => i.id),
        paging: {
          total: this.itemsTotal ?? this.items.length,
          offset: params.offset ?? 0,
          limit: params.limit ?? 20,
        },
      }),
      getItems: async (ids) => this.items.filter((i) => ids.includes(i.id)),
      getItem: async (itemId) => {
        const found = this.items.find((i) => i.id === itemId);
        if (!found) throw new Error(`item ${itemId} não encontrado no fake`);
        return found;
      },
      getCategory: async () =>
        this.category ?? { id: 'MLB1', name: 'Cat', path_from_root: [{ id: 'MLB1', name: 'Cat' }] },
    };
  }
}

export class FakeCatalogSyncRepository implements CatalogSyncRepository {
  products: NormalizedProduct[] = [];
  categories: NormalizedCategory[] = [];
  priceUpdates: Array<{ externalId: string; price: number | null }> = [];

  async upsertProduct(product: NormalizedProduct): Promise<UpsertProductResult> {
    const existing = this.products.find((p) => p.externalId === product.externalId);
    if (existing) {
      const priceChanged = existing.price !== product.price;
      Object.assign(existing, product);
      return { created: false, priceChanged, variantCount: product.variants.length };
    }
    this.products.push(product);
    return { created: true, priceChanged: product.price != null, variantCount: product.variants.length };
  }

  async updateVariantStockAndPrice(input: {
    companyId: string;
    marketplaceAccountId: string;
    externalId: string;
    price: number | null;
    availableQuantity: number;
  }): Promise<{ found: boolean; priceChanged: boolean }> {
    const product = this.products.find((p) => p.externalId === input.externalId);
    if (!product) return { found: false, priceChanged: false };
    const priceChanged = product.price !== input.price;
    product.price = input.price;
    product.availableQuantity = input.availableQuantity;
    this.priceUpdates.push({ externalId: input.externalId, price: input.price });
    return { found: true, priceChanged };
  }

  async upsertCategory(category: NormalizedCategory): Promise<void> {
    const existing = this.categories.find((c) => c.externalId === category.externalId);
    if (existing) Object.assign(existing, category);
    else this.categories.push(category);
  }
}

export function sampleItem(id: string, overrides: Partial<MlRawItem> = {}): MlRawItem {
  return {
    id,
    title: `Produto ${id}`,
    price: 100,
    currency_id: 'BRL',
    available_quantity: 10,
    status: 'active',
    category_id: 'MLB1',
    seller_sku: `SKU-${id}`,
    attributes: [{ id: 'GTIN', value_name: '7891234567890' }],
    pictures: [{ id: 'pic1', secure_url: 'https://img/1.jpg' }],
    variations: [
      {
        id: 1,
        price: 100,
        available_quantity: 6,
        seller_sku: `SKU-${id}-P`,
        attribute_combinations: [
          { id: 'COLOR', value_name: 'Azul' },
          { id: 'SIZE', value_name: 'P' },
        ],
      },
      {
        id: 2,
        price: 100,
        available_quantity: 4,
        seller_sku: `SKU-${id}-M`,
        attribute_combinations: [
          { id: 'COLOR', value_name: 'Azul' },
          { id: 'SIZE', value_name: 'M' },
        ],
      },
    ],
    ...overrides,
  };
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
