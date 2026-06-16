import { SyncOrdersUseCase } from './sync-orders.use-case';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { AesGcmTokenCipher } from '../../../../shared/crypto/aes-gcm-token-cipher';
import { IntegrationNotFoundError } from '../errors';
import {
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
  FakeOrderSyncRepository,
  sampleOrder,
} from '../__fixtures__/integration-fakes';

describe('SyncOrdersUseCase', () => {
  const cipher = new AesGcmTokenCipher('sync-test-encryption-key-12345678');
  let accounts: FakeMarketplaceAccountRepository;
  let apiFactory: FakeMlApiFactory;
  let orders: FakeOrderSyncRepository;
  let useCase: SyncOrdersUseCase;

  beforeEach(() => {
    accounts = new FakeMarketplaceAccountRepository();
    apiFactory = new FakeMlApiFactory();
    orders = new FakeOrderSyncRepository();
    const session = new MercadoLivreSession(cipher, new FakeMlOAuth(), accounts, apiFactory);
    useCase = new SyncOrdersUseCase(accounts, session, orders);

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
    apiFactory.orders = [sampleOrder(1001), sampleOrder(1002)];
  });

  it('importa e faz upsert dos pedidos da conta', async () => {
    const result = await useCase.execute({ accountId: 'acc-1' });

    expect(result).toEqual({ imported: 2, created: 2, updated: 0 });
    expect(orders.upserts.map((o) => o.externalId)).toEqual(['1001', '1002']);
    expect(accounts.syncedAt).toBeInstanceOf(Date);
  });

  it('reprocessar não recria (created=0, updated=2) — idempotência da fatia', async () => {
    await useCase.execute({ accountId: 'acc-1' });
    const second = await useCase.execute({ accountId: 'acc-1' });

    expect(second).toEqual({ imported: 2, created: 0, updated: 2 });
  });

  it('falha quando a conta não existe', async () => {
    await expect(useCase.execute({ accountId: 'missing' })).rejects.toBeInstanceOf(
      IntegrationNotFoundError,
    );
  });
});
