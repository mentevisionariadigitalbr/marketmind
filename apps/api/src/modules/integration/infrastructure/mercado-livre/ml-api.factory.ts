import { MercadoLivreClient } from '@marketmind/sdk-mercadolivre';
import {
  MercadoLivreApi,
  MercadoLivreApiFactory,
  MlOrderSearch,
} from '../../domain/ports/mercado-livre.port';

/** Cria um cliente ML autenticado (a partir de um access token já válido). */
export class MercadoLivreApiFactoryAdapter implements MercadoLivreApiFactory {
  create(accessToken: string): MercadoLivreApi {
    const client = new MercadoLivreClient({ accessToken });
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
        // O shape do SDK é estruturalmente compatível com MlOrderSearch.
        return result as unknown as MlOrderSearch;
      },
    };
  }
}
