import { SyncVariationsUseCase } from './sync-variations.use-case';
import { SyncInventoryUseCase } from './sync-inventory.use-case';
import { SyncPricesUseCase } from './sync-prices.use-case';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { AesGcmTokenCipher } from '../../../../shared/crypto/aes-gcm-token-cipher';
import { IntegrationNotFoundError } from '../errors';
import {
  FakeCatalogSyncRepository,
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
  sampleItem,
} from '../__fixtures__/integration-fakes';

function setup() {
  const cipher = new AesGcmTokenCipher('item-test-encryption-key-1234567890');
  const accounts = new FakeMarketplaceAccountRepository();
  const apiFactory = new FakeMlApiFactory();
  const catalog = new FakeCatalogSyncRepository();
  const session = new MercadoLivreSession(cipher, new FakeMlOAuth(), accounts, apiFactory);
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
  apiFactory.items = [sampleItem('MLB1')];
  return { accounts, apiFactory, catalog, session };
}

describe('SyncVariationsUseCase', () => {
  it('faz upsert completo do anúncio (variações)', async () => {
    const { accounts, catalog, session } = setup();
    const uc = new SyncVariationsUseCase(accounts, session, catalog);
    const out = await uc.execute({ accountId: 'acc-1', itemId: 'MLB1' });
    expect(out.variantCount).toBe(2);
    expect(catalog.products[0].externalId).toBe('MLB1');
  });

  it('falha se conta não existe', async () => {
    const { accounts, catalog, session } = setup();
    const uc = new SyncVariationsUseCase(accounts, session, catalog);
    await expect(uc.execute({ accountId: 'x', itemId: 'MLB1' })).rejects.toBeInstanceOf(
      IntegrationNotFoundError,
    );
  });
});

describe('SyncInventoryUseCase / SyncPricesUseCase', () => {
  it('inventory: atualiza estoque de produto existente', async () => {
    const { accounts, catalog, session } = setup();
    await new SyncVariationsUseCase(accounts, session, catalog).execute({ accountId: 'acc-1', itemId: 'MLB1' });

    const out = await new SyncInventoryUseCase(accounts, session, catalog).execute({
      accountId: 'acc-1',
      itemId: 'MLB1',
    });
    expect(out.found).toBe(true);
  });

  it('prices: detecta mudança de preço', async () => {
    const { accounts, apiFactory, catalog, session } = setup();
    await new SyncVariationsUseCase(accounts, session, catalog).execute({ accountId: 'acc-1', itemId: 'MLB1' });

    apiFactory.items = [sampleItem('MLB1', { price: 150 })];
    const out = await new SyncPricesUseCase(accounts, session, catalog).execute({
      accountId: 'acc-1',
      itemId: 'MLB1',
    });
    expect(out).toEqual({ found: true, priceChanged: true });
  });

  it('inventory: produto inexistente => found=false', async () => {
    const { accounts, apiFactory, catalog, session } = setup();
    apiFactory.items = [sampleItem('MLB-NEW')];
    const out = await new SyncInventoryUseCase(accounts, session, catalog).execute({
      accountId: 'acc-1',
      itemId: 'MLB-NEW',
    });
    expect(out.found).toBe(false);
  });
});
