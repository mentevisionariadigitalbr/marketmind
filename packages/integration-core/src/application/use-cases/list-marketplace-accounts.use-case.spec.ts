import { ListMarketplaceAccountsUseCase } from './list-marketplace-accounts.use-case';
import { FakeMarketplaceAccountRepository } from '../__fixtures__/integration-fakes';
import type { MarketplaceAccount } from '../../domain/ports/marketplace-account.repository';

function account(over: Partial<MarketplaceAccount>): MarketplaceAccount {
  return {
    id: 'acc-1',
    companyId: 'co-A',
    marketplaceId: 'mkt-ml',
    externalUserId: '123',
    nickname: 'LOJA',
    accessTokenEnc: 'enc-access',
    refreshTokenEnc: 'enc-refresh',
    tokenExpiresAt: new Date('2999-01-01'),
    status: 'CONNECTED',
    ...over,
  };
}

describe('ListMarketplaceAccountsUseCase', () => {
  const NOW = new Date('2026-06-20T00:00:00Z').getTime();

  it('lista contas da empresa sem expor tokens', async () => {
    const repo = new FakeMarketplaceAccountRepository();
    repo.accounts.push(account({}));
    const useCase = new ListMarketplaceAccountsUseCase(repo);

    const result = await useCase.execute({ companyId: 'co-A' }, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('accessTokenEnc');
    expect(result[0]).not.toHaveProperty('refreshTokenEnc');
    expect(result[0].nickname).toBe('LOJA');
    expect(result[0].status).toBe('CONNECTED');
  });

  it('CONNECTED com token vencido vira EXPIRED', async () => {
    const repo = new FakeMarketplaceAccountRepository();
    repo.accounts.push(account({ tokenExpiresAt: new Date('2026-01-01T00:00:00Z') }));
    const result = await new ListMarketplaceAccountsUseCase(repo).execute({ companyId: 'co-A' }, NOW);
    expect(result[0].status).toBe('EXPIRED');
  });

  it('isola por empresa (não retorna contas de outro tenant)', async () => {
    const repo = new FakeMarketplaceAccountRepository();
    repo.accounts.push(account({ id: 'a', companyId: 'co-A' }));
    repo.accounts.push(account({ id: 'b', companyId: 'co-B', externalUserId: '999' }));
    const result = await new ListMarketplaceAccountsUseCase(repo).execute({ companyId: 'co-A' }, NOW);
    expect(result.map((r) => r.id)).toEqual(['a']);
  });
});
