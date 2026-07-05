import { Inject, Injectable } from '@nestjs/common';
import {
  MARKETPLACE_ACCOUNT_REPOSITORY,
  MarketplaceAccountRepository,
} from '../../domain/ports/marketplace-account.repository';
import {
  ORDER_SYNC_REPOSITORY,
  OrderSyncRepository,
} from '../../domain/ports/order-sync.repository';
import { MercadoLivreSession } from '../services/mercado-livre-session.service';
import { mapMeliOrder } from '../mappers/ml-order.mapper';
import { IntegrationNotFoundError } from '../errors';

export interface SyncOrdersInput {
  accountId: string;
  limit?: number;
  offset?: number;
  status?: string;
}

export interface SyncOrdersResult {
  imported: number;
  created: number;
  updated: number;
}

/**
 * Importa pedidos de uma conta de marketplace de forma idempotente: cada pedido
 * é mapeado e feito upsert por (conta, external_id) — reprocessar não duplica.
 */
@Injectable()
export class SyncOrdersUseCase {
  constructor(
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    private readonly session: MercadoLivreSession,
    @Inject(ORDER_SYNC_REPOSITORY) private readonly orders: OrderSyncRepository,
  ) {}

  async execute(input: SyncOrdersInput): Promise<SyncOrdersResult> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) {
      throw new IntegrationNotFoundError('Conta de marketplace');
    }

    const api = await this.session.apiForAccount(account);
    const search = await api.searchOrders({
      sellerId: Number(account.externalUserId),
      offset: input.offset,
      limit: input.limit,
      status: input.status,
      // Ordena por data (mais recentes primeiro) para uma janela cronológica correta —
      // evita o viés do sort padrão do ML (por última atualização), que comprime a densidade.
      sort: 'date_desc',
    });

    let created = 0;
    let updated = 0;
    for (const raw of search.results) {
      const normalized = mapMeliOrder(raw, {
        companyId: account.companyId,
        marketplaceAccountId: account.id,
      });
      const result = await this.orders.upsertOrder(normalized);
      if (result.created) created += 1;
      else updated += 1;
    }

    await this.accounts.markSynced(account.id, new Date());
    return { imported: search.results.length, created, updated };
  }
}
