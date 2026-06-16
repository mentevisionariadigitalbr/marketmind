import { Resource } from './base';
import { MeliCategory } from '../types';

export class CategoriesResource extends Resource {
  get(categoryId: string): Promise<MeliCategory> {
    return this.getJson<MeliCategory>(`/categories/${categoryId}`);
  }
}
