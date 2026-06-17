import { Inject, Injectable } from '@nestjs/common';
import {
  MARKETPLACE_ACCOUNT_REPOSITORY,
  MarketplaceAccountRepository,
} from '../../domain/ports/marketplace-account.repository';
import {
  CATALOG_SYNC_REPOSITORY,
  CatalogSyncRepository,
} from '../../domain/ports/catalog-sync.repository';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { SyncItemInput } from './sync-variations.use-case';
import { IntegrationNotFoundError } from '../errors';

/** Atualização pontual de preço de um anúncio + registro no histórico (webhook de preço). */
@Injectable()
export class SyncPricesUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    private readonly session: MercadoLivreSession,
    @Inject(CATALOG_SYNC_REPOSITORY) private readonly catalog: CatalogSyncRepository,
  ) {}

  async execute(input: SyncItemInput): Promise<{ found: boolean; priceChanged: boolean }> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new IntegrationNotFoundError('Conta de marketplace');

    const api = await this.session.apiForAccount(account);
    const item = await api.getItem(input.itemId);
    return this.catalog.updateVariantStockAndPrice({
      companyId: account.companyId,
      marketplaceAccountId: account.id,
      externalId: item.id,
      price: item.price ?? null,
      availableQuantity: item.available_quantity ?? 0,
    });
  }
}
