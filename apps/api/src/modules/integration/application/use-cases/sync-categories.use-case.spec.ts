import { SyncCategoriesUseCase } from './sync-categories.use-case';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { AesGcmTokenCipher } from '../../../../shared/crypto/aes-gcm-token-cipher';
import {
  FakeCatalogSyncRepository,
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
} from '../__fixtures__/integration-fakes';

describe('SyncCategoriesUseCase', () => {
  const cipher = new AesGcmTokenCipher('cat-test-encryption-key-1234567890');
  let accounts: FakeMarketplaceAccountRepository;
  let apiFactory: FakeMlApiFactory;
  let catalog: FakeCatalogSyncRepository;
  let useCase: SyncCategoriesUseCase;

  beforeEach(() => {
    accounts = new FakeMarketplaceAccountRepository();
    apiFactory = new FakeMlApiFactory();
    catalog = new FakeCatalogSyncRepository();
    const session = new MercadoLivreSession(cipher, new FakeMlOAuth(), accounts, apiFactory);
    useCase = new SyncCategoriesUseCase(accounts, session, catalog);

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
    apiFactory.category = {
      id: 'MLB1055',
      name: 'Tênis',
      path_from_root: [
        { id: 'MLB1276', name: 'Calçados' },
        { id: 'MLB1055', name: 'Tênis' },
      ],
    };
  });

  it('sincroniza categoria com parent derivado do path_from_root', async () => {
    const out = await useCase.execute({ accountId: 'acc-1', categoryId: 'MLB1055' });

    expect(out).toEqual({ externalId: 'MLB1055', depth: 2 });
    expect(catalog.categories[0]).toMatchObject({
      externalId: 'MLB1055',
      name: 'Tênis',
      parentExternalId: 'MLB1276',
    });
  });

  it('é idempotente (upsert)', async () => {
    await useCase.execute({ accountId: 'acc-1', categoryId: 'MLB1055' });
    await useCase.execute({ accountId: 'acc-1', categoryId: 'MLB1055' });
    expect(catalog.categories).toHaveLength(1);
  });
});
