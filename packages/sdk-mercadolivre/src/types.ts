/** Conjunto de tokens devolvido pelo fluxo OAuth do Mercado Livre. */
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Segundos até expirar (campo `expires_in` da API). */
  expiresIn: number;
  /** Momento (epoch ms) em que os tokens foram obtidos — base para `expiresAt`. */
  obtainedAt: number;
  tokenType: string;
  scope: string;
  /** Id do usuário/vendedor no Mercado Livre (`user_id`). */
  userId: number;
}

export interface MeliUser {
  id: number;
  nickname: string;
  email?: string;
  site_id?: string;
  [key: string]: unknown;
}

export interface MeliOrderItem {
  item: { id: string; title: string; seller_sku?: string | null; variation_id?: number | null };
  quantity: number;
  unit_price: number;
  sale_fee?: number;
  [key: string]: unknown;
}

export interface MeliPayment {
  total_paid_amount?: number;
  shipping_cost?: number;
  status?: string;
  [key: string]: unknown;
}

export interface MeliOrder {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  currency_id: string;
  order_items: MeliOrderItem[];
  payments?: MeliPayment[];
  buyer?: { id: number; nickname?: string };
  seller?: { id: number };
  shipping?: { id?: number; cost?: number };
  [key: string]: unknown;
}

export interface MeliSearchResult<T> {
  results: T[];
  paging: { total: number; offset: number; limit: number };
}

export interface MeliItem {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  sold_quantity?: number;
  status: string;
  seller_sku?: string | null;
  category_id?: string;
  variations?: Array<{ id: number; available_quantity: number; seller_sku?: string | null }>;
  [key: string]: unknown;
}

export interface MeliCategory {
  id: string;
  name: string;
  path_from_root?: Array<{ id: string; name: string }>;
  [key: string]: unknown;
}

export interface MeliQuestion {
  id: number;
  text: string;
  status: string;
  item_id: string;
  date_created: string;
  [key: string]: unknown;
}
