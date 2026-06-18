import {
  MarketplaceRegistry,
  MarketplaceFactory,
  MarketplaceUnsupportedError,
  MarketplaceAccountRef,
  MarketplaceAdapter,
  MarketplaceProvider,
  MarketplaceCode,
  MARKETPLACE_CODES,
  isMarketplaceCode,
} from './index';

function stubAdapter(code: MarketplaceCode): MarketplaceAdapter {
  return {
    code,
    capabilities: {
      orders: true,
      catalog: true,
      inventory: true,
      price: true,
      categories: true,
      webhooks: true,
    },
    syncOrders: async () => ({ imported: 0 }),
    syncCatalog: async () => ({ imported: 0 }),
    refreshAccount: async () => undefined,
  };
}

function stubProvider(code: MarketplaceCode): MarketplaceProvider {
  return { code, createAdapter: () => stubAdapter(code) };
}

describe('MarketplaceCode', () => {
  it('inclui os 5 marketplaces alvo', () => {
    expect(MARKETPLACE_CODES).toEqual(['MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU', 'CUSTOM']);
    expect(isMarketplaceCode('SHOPEE')).toBe(true);
    expect(isMarketplaceCode('NOPE')).toBe(false);
  });
});

describe('MarketplaceRegistry', () => {
  it('register/resolve/has/list', () => {
    const registry = new MarketplaceRegistry();
    registry.register(stubProvider('MERCADO_LIVRE'));

    expect(registry.has('MERCADO_LIVRE')).toBe(true);
    expect(registry.has('SHOPEE')).toBe(false);
    expect(registry.list()).toEqual(['MERCADO_LIVRE']);
    expect(registry.resolve('MERCADO_LIVRE').code).toBe('MERCADO_LIVRE');
    expect(registry.adapterFor('MERCADO_LIVRE').capabilities.orders).toBe(true);
  });

  it('marketplace não registrado lança erro (preparado p/ Shopee/Amazon/Magalu)', () => {
    const registry = new MarketplaceRegistry();
    expect(() => registry.resolve('AMAZON')).toThrow(MarketplaceUnsupportedError);
  });

  it('Open/Closed: registrar novos marketplaces sem alterar o existente', () => {
    const registry = new MarketplaceRegistry()
      .register(stubProvider('MERCADO_LIVRE'))
      .register(stubProvider('SHOPEE'))
      .register(stubProvider('AMAZON'))
      .register(stubProvider('MAGALU'));
    expect(registry.list()).toHaveLength(4);
  });
});

describe('MarketplaceFactory', () => {
  it('resolve adapter por conta', () => {
    const registry = new MarketplaceRegistry().register(stubProvider('MERCADO_LIVRE'));
    const factory = new MarketplaceFactory(registry);
    const account = new MarketplaceAccountRef('a1', 'c1', 'MERCADO_LIVRE', '555');
    expect(factory.forAccount(account).code).toBe('MERCADO_LIVRE');
    expect(account.equals(new MarketplaceAccountRef('a1', 'c1', 'MERCADO_LIVRE', '999'))).toBe(true);
  });
});
