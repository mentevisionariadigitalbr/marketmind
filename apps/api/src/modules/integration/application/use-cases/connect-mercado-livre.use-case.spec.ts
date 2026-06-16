import { ConnectMercadoLivreUseCase } from './connect-mercado-livre.use-case';
import { AesGcmTokenCipher } from '../../../../shared/crypto/aes-gcm-token-cipher';
import { IntegrationNotConfiguredError } from '../errors';
import {
  FakeMarketplaceAccountRepository,
  FakeMlApiFactory,
  FakeMlOAuth,
} from '../__fixtures__/integration-fakes';

describe('ConnectMercadoLivreUseCase', () => {
  const cipher = new AesGcmTokenCipher('integration-test-encryption-key-123');
  let accounts: FakeMarketplaceAccountRepository;
  let apiFactory: FakeMlApiFactory;
  let useCase: ConnectMercadoLivreUseCase;

  beforeEach(() => {
    accounts = new FakeMarketplaceAccountRepository();
    apiFactory = new FakeMlApiFactory();
    useCase = new ConnectMercadoLivreUseCase(new FakeMlOAuth(), apiFactory, cipher, accounts);
  });

  it('persiste a conta com tokens cifrados em repouso', async () => {
    const account = await useCase.execute({ companyId: 'c1', code: 'CODE-1' });

    expect(account.externalUserId).toBe('555');
    expect(account.nickname).toBe('LOJA');

    const stored = accounts.accounts[0];
    // armazenado cifrado (não em texto puro), mas decifra para o token original
    expect(stored.accessTokenEnc).not.toContain('AT-CODE-1');
    expect(cipher.decrypt(stored.accessTokenEnc)).toBe('AT-CODE-1');
    expect(cipher.decrypt(stored.refreshTokenEnc)).toBe('RT');
  });

  it('reconexão é idempotente (upsert, não duplica conta)', async () => {
    await useCase.execute({ companyId: 'c1', code: 'CODE-1' });
    await useCase.execute({ companyId: 'c1', code: 'CODE-2' });

    expect(accounts.upsertCalls).toBe(2);
    expect(accounts.accounts).toHaveLength(1);
    expect(cipher.decrypt(accounts.accounts[0].accessTokenEnc)).toBe('AT-CODE-2');
  });

  it('falha se o marketplace ML não estiver cadastrado', async () => {
    accounts.marketplaceId = null;
    await expect(useCase.execute({ companyId: 'c1', code: 'CODE' })).rejects.toBeInstanceOf(
      IntegrationNotConfiguredError,
    );
  });
});
