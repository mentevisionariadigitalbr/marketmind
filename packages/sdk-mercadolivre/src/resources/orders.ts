import { Resource } from './base';
import { MeliOrder, MeliSearchResult } from '../types';

export interface OrderSearchParams {
  sellerId: number | string;
  status?: string;
  offset?: number;
  limit?: number;
  /** ex.: 'date_desc' | 'date_asc'. */
  sort?: string;
  /** Filtra por data de criação (ISO) — útil em sync incremental. */
  dateCreatedFrom?: string;
}

export class OrdersResource extends Resource {
  get(orderId: number | string): Promise<MeliOrder> {
    return this.getJson<MeliOrder>(`/orders/${orderId}`);
  }

  search(params: OrderSearchParams): Promise<MeliSearchResult<MeliOrder>> {
    return this.getJson<MeliSearchResult<MeliOrder>>('/orders/search', {
      seller: params.sellerId,
      'order.status': params.status,
      offset: params.offset,
      limit: params.limit,
      sort: params.sort,
      'order.date_created.from': params.dateCreatedFrom,
    });
  }
}
