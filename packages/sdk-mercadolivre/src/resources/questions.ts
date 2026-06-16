import { Resource } from './base';
import { MeliQuestion, MeliSearchResult } from '../types';

export interface QuestionSearchParams {
  itemId?: string;
  sellerId?: number | string;
  status?: string;
  offset?: number;
  limit?: number;
}

export class QuestionsResource extends Resource {
  search(params: QuestionSearchParams): Promise<MeliSearchResult<MeliQuestion>> {
    return this.getJson<MeliSearchResult<MeliQuestion>>('/questions/search', {
      item: params.itemId,
      seller_id: params.sellerId,
      status: params.status,
      offset: params.offset,
      limit: params.limit,
    });
  }
}
