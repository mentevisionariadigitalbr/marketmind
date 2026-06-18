import { MercadoLivreSession } from './mercado-livre-session.service';
import { AesGcmTokenCipher } from '../../crypto/aes-gcm-token-cipher';
import { MarketplaceAccount } from '../../domain/ports/marketplace-account.repository';
import {
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
} from '../__fixtures__/integration-fakes';

describe('MercadoLivreSession', () => {
  const cipher = new AesGcmTokenCipher('session-test-encryption-key-123456');
  let accounts: FakeMarketplaceAccountRepository;
  let oauth: FakeMlOAuth;
  let apiFactory: FakeMlApiFactory;
  let session: MercadoLivreSession;

  beforeEach(() => {
    accounts = new FakeMarketplaceAccountRepository();
    oauth = new FakeMlOAuth();
    apiFactory = new FakeMlApiFactory();
    session = new MercadoLivreSession(cipher, oauth, accounts, apiFactory);
  });

  function account(expiresAt: Date): MarketplaceAccount {
    const acc: MarketplaceAccount = {
      id: 'acc-1',
      companyId: 'c1',
      marketplaceId: 'mkt-ml',
      externalUserId: '555',
      nickname: 'LOJA',
      accessTokenEnc: cipher.encrypt('AT-current'),
      refreshTokenEnc: cipher.encrypt('RT-current'),
      tokenExpiresAt: expiresAt,
      status: 'CONNECTED',
    };
    accounts.accounts.push(acc);
    return acc;
  }

  it('usa o token atual quando ainda válido (sem refresh)', async () => {
    const acc = account(new Date(Date.now() + 3_600_000));
    await session.apiForAccount(acc);

    expect(oauth.refreshCalls).toBe(0);
    expect(apiFactory.lastToken).toBe('AT-current');
  });

  it('renova automaticamente quando expirado e persiste os novos tokens cifrados', async () => {
    const acc = account(new Date(Date.now() - 1000));
    await session.apiForAccount(acc);

    expect(oauth.refreshCalls).toBe(1);
    expect(apiFactory.lastToken).toBe('AT-new');
    expect(cipher.decrypt(acc.accessTokenEnc)).toBe('AT-new');
    expect(cipher.decrypt(acc.refreshTokenEnc)).toBe('RT-new');
  });
});
