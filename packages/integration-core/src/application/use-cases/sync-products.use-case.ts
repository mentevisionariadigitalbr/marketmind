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

export interface SyncProductsInput {
  accountId: string;
  offset?: number;
  limit?: number;
}

export interface SyncProductsResult {
  fetched: number;
  created: number;
  updated: number;
  priceChanges: number;
  total: number;
  nextOffset: number;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 20; // multiget do ML aceita até 20 ids

/**
 * Sincroniza uma PÁGINA do catálogo (produtos+variações+estoque+preços+imagens),
 * de forma idempotente. Paginação obrigatória: devolve `hasMore`/`nextOffset`
 * para o worker re-despachar a próxima página (backpressure / full sync).
 */
@Injectable()
export class SyncProductsUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    private readonly session: MercadoLivreSession,
    @Inject(CATALOG_SYNC_REPOSITORY) private readonly catalog: CatalogSyncRepository,
  ) {}

  async execute(input: SyncProductsInput): Promise<SyncProductsResult> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) {
      throw new IntegrationNotFoundError('Conta de marketplace');
    }

    const api = await this.session.apiForAccount(account);
    const offset = input.offset ?? 0;
    const limit = input.limit ?? DEFAULT_LIMIT;

    const page = await api.getItemIds({
      sellerId: Number(account.externalUserId),
      offset,
      limit,
    });
    const items = await api.getItems(page.results);

    let created = 0;
    let updated = 0;
    let priceChanges = 0;
    for (const item of items) {
      const normalized = mapMeliItem(item, {
        companyId: account.companyId,
        marketplaceAccountId: account.id,
      });
      const result = await this.catalog.upsertProduct(normalized);
      if (result.created) created += 1;
      else updated += 1;
      if (result.priceChanged) priceChanges += 1;
    }

    await this.accounts.markSynced(account.id, new Date());
    const nextOffset = offset + limit;
    return {
      fetched: items.length,
      created,
      updated,
      priceChanges,
      total: page.paging.total,
      nextOffset,
      hasMore: nextOffset < page.paging.total,
    };
  }
}
