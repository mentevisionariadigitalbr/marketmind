import { AdminClaims } from '../admin-claims';

export const ADMIN_TOKEN_SERVICE = Symbol('AdminTokenService');

export interface AdminTokenService {
  /** Assina um token de admin (segredo próprio). */
  sign(claims: AdminClaims): Promise<string>;
  /** Verifica e devolve as claims; lança se inválido/expirado/segredo errado. */
  verify(token: string): Promise<AdminClaims>;
}
