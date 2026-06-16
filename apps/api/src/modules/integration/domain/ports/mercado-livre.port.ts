export const MERCADO_LIVRE_OAUTH = Symbol('MercadoLivreOAuthPort');
export const MERCADO_LIVRE_API_FACTORY = Symbol('MercadoLivreApiFactory');

export interface MlTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  obtainedAt: number;
  userId: number;
  scope: string;
}

export interface MercadoLivreOAuthPort {
  authorizationUrl(state?: string): string;
  exchangeCode(code: string): Promise<MlTokenSet>;
  refresh(refreshToken: string): Promise<MlTokenSet>;
}

/** Subconjunto do pedido cru do ML consumido pelo mapper (estruturalmente compatível com o SDK). */
export interface MlRawOrder {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  currency_id: string;
  order_items: Array<{
    item: { id: string; title: string; seller_sku?: string | null };
    quantity: number;
    unit_price: number;
    sale_fee?: number;
  }>;
  buyer?: { id: number; nickname?: string };
  shipping?: { cost?: number };
  payments?: Array<{ shipping_cost?: number }>;
}

export interface MlOrderSearch {
  results: MlRawOrder[];
  paging: { total: number; offset: number; limit: number };
}

export interface MercadoLivreApi {
  getMe(): Promise<{ id: number; nickname: string }>;
  searchOrders(params: {
    sellerId: number;
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<MlOrderSearch>;
}

export interface MercadoLivreApiFactory {
  create(accessToken: string): MercadoLivreApi;
}
