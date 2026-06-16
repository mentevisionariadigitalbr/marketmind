import { Resource } from './base';
import { MeliItem, MeliSearchResult } from '../types';

export interface ItemSearchParams {
  status?: string;
  offset?: number;
  limit?: number;
}

export class ItemsResource extends Resource {
  get(itemId: string): Promise<MeliItem> {
    return this.getJson<MeliItem>(`/items/${itemId}`);
  }

  /** Ids dos anúncios de um vendedor (multiget posterior por `get`). */
  bySeller(userId: number | string, params: ItemSearchParams = {}): Promise<MeliSearchResult<string>> {
    return this.getJson<MeliSearchResult<string>>(`/users/${userId}/items/search`, {
      status: params.status,
      offset: params.offset,
      limit: params.limit,
    });
  }
}
