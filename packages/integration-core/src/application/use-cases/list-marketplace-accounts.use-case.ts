import { Inject, Injectable } from '@nestjs/common';
import {
  MARKETPLACE_ACCOUNT_REPOSITORY,
  MarketplaceAccountRepository,
  MarketplaceAccountStatus,
} from '../../domain/ports/marketplace-account.repository';

export interface MarketplaceAccountView {
  id: string;
  marketplace: string;
  nickname: string | null;
  externalUserId: string;
  status: MarketplaceAccountStatus;
  tokenExpiresAt: string;
  lastSyncedAt: string | null;
}

/** Lista as contas de marketplace de uma empresa (sem expor tokens). Calcula o
 *  status efetivo: CONNECTED com token vencido vira EXPIRED para a UI. */
@Injectable()
export class ListMarketplaceAccountsUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
  ) {}

  async execute(input: { companyId: string }, now: number = Date.now()): Promise<MarketplaceAccountView[]> {
    const list = await this.accounts.listByCompany(input.companyId);
    return list.map((a) => ({
      id: a.id,
      marketplace: a.marketplaceName,
      nickname: a.nickname,
      externalUserId: a.externalUserId,
      status: a.status === 'CONNECTED' && a.tokenExpiresAt.getTime() < now ? 'EXPIRED' : a.status,
      tokenExpiresAt: a.tokenExpiresAt.toISOString(),
      lastSyncedAt: a.lastSyncedAt ? a.lastSyncedAt.toISOString() : null,
    }));
  }
}
