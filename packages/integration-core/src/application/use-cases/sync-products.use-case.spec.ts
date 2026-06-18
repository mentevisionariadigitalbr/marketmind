import { SyncProductsUseCase } from './sync-products.use-case';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { AesGcmTokenCipher } from '../../crypto/aes-gcm-token-cipher';
import { IntegrationNotFoundError } from '../errors';
import {
  FakeCatalogSyncRepository,
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
  sampleItem,
} from '../__fixtures__/integration-fakes';

describe('SyncProductsUseCase', () => {
  const cipher = new AesGcmTokenCipher('catalog-test-encryption-key-12345678');
  let accounts: FakeMarketplaceAccountRepository;
  let apiFactory: FakeMlApiFactory;
  let catalog: FakeCatalogSyncRepository;
  let useCase: SyncProductsUseCase;

  beforeEach(() => {
    accounts = new FakeMarketplaceAccountRepository();
    apiFactory = new FakeMlApiFactory();
    catalog = new FakeCatalogSyncRepository();
    const session = new MercadoLivreSession(cipher, new FakeMlOAuth(), accounts, apiFactory);
    useCase = new SyncProductsUseCase(accounts, session, catalog);

    accounts.accounts.push({
      id: 'acc-1',
      companyId: 'c1',
      marketplaceId: 'mkt-ml',
      externalUserId: '555',
      nickname: 'LOJA',
      accessTokenEnc: cipher.encrypt('AT'),
      refreshTokenEnc: cipher.encrypt('RT'),
      tokenExpiresAt: new Date(Date.now() + 3_600_000),
      status: 'CONNECTED',
    });
    apiFactory.items = [sampleItem('MLB1'), sampleItem('MLB2')];
  });

  it('sincroniza uma página de produtos (upsert idempotente)', async () => {
    const result = await useCase.execute({ accountId: 'acc-1' });

    expect(result).toMatchObject({ fetched: 2, created: 2, updated: 0, hasMore: false });
    expect(catalog.products.map((p) => p.externalId)).toEqual(['MLB1', 'MLB2']);
    expect(catalog.products[0].variants).toHaveLength(2);
    expect(accounts.syncedAt).toBeInstanceOf(Date);
  });

  it('reprocessar não duplica (created=0, updated=2)', async () => {
    await useCase.execute({ accountId: 'acc-1' });
    const second = await useCase.execute({ accountId: 'acc-1' });

    expect(second).toMatchObject({ created: 0, updated: 2 });
    expect(catalog.products).toHaveLength(2);
  });

  it('paginação: hasMore + nextOffset quando há mais itens', async () => {
    apiFactory.itemsTotal = 50;
    const result = await useCase.execute({ accountId: 'acc-1', offset: 0, limit: 20 });
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(20);
    expect(result.total).toBe(50);
  });

  it('falha quando a conta não existe', async () => {
    await expect(useCase.execute({ accountId: 'missing' })).rejects.toBeInstanceOf(
      IntegrationNotFoundError,
    );
  });
});
