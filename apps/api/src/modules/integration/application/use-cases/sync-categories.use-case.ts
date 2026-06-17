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
import { IntegrationNotFoundError } from '../errors';

export interface SyncCategoriesInput {
  accountId: string;
  categoryId: string;
}

/** Sincroniza uma categoria + sua árvore (path_from_root → closure table). */
@Injectable()
export class SyncCategoriesUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    private readonly session: MercadoLivreSession,
    @Inject(CATALOG_SYNC_REPOSITORY) private readonly catalog: CatalogSyncRepository,
  ) {}

  async execute(input: SyncCategoriesInput): Promise<{ externalId: string; depth: number }> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new IntegrationNotFoundError('Conta de marketplace');

    const api = await this.session.apiForAccount(account);
    const category = await api.getCategory(input.categoryId);
    const path = category.path_from_root ?? [];
    const parent = path.length >= 2 ? path[path.length - 2].id : null;

    await this.catalog.upsertCategory({
      externalId: category.id,
      name: category.name,
      parentExternalId: parent,
      pathFromRoot: path,
    });
    return { externalId: category.id, depth: path.length };
  }
}
