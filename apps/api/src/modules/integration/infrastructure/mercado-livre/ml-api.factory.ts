import { MercadoLivreClient } from '@marketmind/sdk-mercadolivre';
import { CircuitBreaker } from '@marketmind/queue';
import {
  MercadoLivreApi,
  MercadoLivreApiFactory,
  MlItemSearch,
  MlOrderSearch,
  MlRawCategory,
  MlRawItem,
} from '../../domain/ports/mercado-livre.port';

/**
 * Cria um cliente ML autenticado. Resolve a dívida do Sprint 2.5: o circuit
 * breaker (de @marketmind/queue) agora está **plugado no SDK** — um breaker
 * compartilhado protege contra cascata de falhas da API do Mercado Livre.
 */
export class MercadoLivreApiFactoryAdapter implements MercadoLivreApiFactory {
  private readonly breaker = new CircuitBreaker({
    name: 'mercado-livre',
    failureThreshold: 5,
    cooldownMs: 30_000,
  });

  create(accessToken: string): MercadoLivreApi {
    const client = new MercadoLivreClient({ accessToken, circuitBreaker: this.breaker });
    return {
      async getMe() {
        const me = await client.users.me();
        return { id: me.id, nickname: me.nickname };
      },
      async searchOrders(params) {
        const result = await client.orders.search({
          sellerId: params.sellerId,
          offset: params.offset,
          limit: params.limit,
          status: params.status,
        });
        return result as unknown as MlOrderSearch;
      },
      async getItemIds(params) {
        const result = await client.items.bySeller(params.sellerId, {
          offset: params.offset,
          limit: params.limit,
          status: params.status,
        });
        return result as unknown as MlItemSearch;
      },
      async getItems(itemIds) {
        if (itemIds.length === 0) return [];
        const entries = await client.items.getMany(itemIds);
        return entries
          .filter((e) => e.code === 200 && e.body)
          .map((e) => e.body as unknown as MlRawItem);
      },
      async getItem(itemId) {
        return (await client.items.get(itemId)) as unknown as MlRawItem;
      },
      async getCategory(categoryId) {
        return (await client.categories.get(categoryId)) as unknown as MlRawCategory;
      },
    };
  }
}
