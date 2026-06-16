import { Resource } from './base';
import { MeliUser } from '../types';

export class UsersResource extends Resource {
  /** Dados do usuário autenticado (vendedor dono do token). */
  me(): Promise<MeliUser> {
    return this.getJson<MeliUser>('/users/me');
  }

  get(userId: number | string): Promise<MeliUser> {
    return this.getJson<MeliUser>(`/users/${userId}`);
  }
}
