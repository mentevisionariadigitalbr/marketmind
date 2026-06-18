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
import { mapMeliItem } from '../mappers/ml-item.mapper';
import { IntegrationNotFoundError } from '../errors';

export interface SyncItemInput {
  accountId: string;
  itemId: string;
}

/**
 * Sincroniza um anúncio específico (SKU/cor/tamanho/GTIN/atributos/variações)
 * via upsert idempotente completo. Disparado por webhook de item/publicação.
 */
@Injectable()
export class SyncVariationsUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    private readonly session: MercadoLivreSession,
    @Inject(CATALOG_SYNC_REPOSITORY) private readonly catalog: CatalogSyncRepository,
  ) {}

  async execute(input: SyncItemInput): Promise<{ variantCount: number; created: boolean }> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new IntegrationNotFoundError('Conta de marketplace');

    const api = await this.session.apiForAccount(account);
    const item = await api.getItem(input.itemId);
    const result = await this.catalog.upsertProduct(
      mapMeliItem(item, { companyId: account.companyId, marketplaceAccountId: account.id }),
    );
    return { variantCount: result.variantCount, created: result.created };
  }
}
