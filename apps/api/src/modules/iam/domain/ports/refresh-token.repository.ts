export const REFRESH_TOKEN_REPOSITORY = Symbol('RefreshTokenRepository');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

export interface RefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Revoga um token; opcionalmente registra qual token o substituiu (rotação). */
  revoke(id: string, replacedByTokenId?: string | null): Promise<void>;
  /** Revoga todas as sessões ativas de um usuário (ex.: detecção de reuso). */
  revokeAllForUser(userId: string): Promise<void>;
}
