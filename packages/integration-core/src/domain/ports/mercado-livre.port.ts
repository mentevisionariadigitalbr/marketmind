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

export interface MlRawAttribute {
  id: string;
  name?: string;
  value_name?: string | null;
}

export interface MlRawPicture {
  id?: string;
  url?: string;
  secure_url?: string;
}

export interface MlRawVariation {
  id: number;
  price?: number;
  available_quantity: number;
  seller_sku?: string | null;
  attribute_combinations?: MlRawAttribute[];
  picture_ids?: string[];
}

export interface MlRawItem {
  id: string;
  title: string;
  price: number;
  currency_id?: string;
  available_quantity: number;
  status: string;
  category_id?: string;
  permalink?: string;
  thumbnail?: string;
  listing_type_id?: string;
  seller_sku?: string | null;
  attributes?: MlRawAttribute[];
  pictures?: MlRawPicture[];
  variations?: MlRawVariation[];
}

export interface MlRawCategory {
  id: string;
  name: string;
  path_from_root?: Array<{ id: string; name: string }>;
}

export interface MlItemSearch {
  results: string[];
  paging: { total: number; offset: number; limit: number };
}

export interface MercadoLivreApi {
  getMe(): Promise<{ id: number; nickname: string }>;
  searchOrders(params: {
    sellerId: number;
    offset?: number;
    limit?: number;
    status?: string;
    /** Ordenação ML (ex.: 'date_desc') — por data, para uma janela cronológica correta. */
    sort?: string;
  }): Promise<MlOrderSearch>;
  /** Ids dos anúncios de um vendedor (paginado). */
  getItemIds(params: {
    sellerId: number;
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<MlItemSearch>;
  /** Detalhes de vários anúncios (multiget). */
  getItems(itemIds: string[]): Promise<MlRawItem[]>;
  getItem(itemId: string): Promise<MlRawItem>;
  getCategory(categoryId: string): Promise<MlRawCategory>;
}

export interface MercadoLivreApiFactory {
  create(accessToken: string): MercadoLivreApi;
}
