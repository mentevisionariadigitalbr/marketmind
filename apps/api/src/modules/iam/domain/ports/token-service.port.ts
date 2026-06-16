export const TOKEN_SERVICE = Symbol('TokenService');

export interface AccessClaims {
  /** user id */
  sub: string;
  companyId: string;
  /** Papel primário (compatibilidade). Ver `roles` para o conjunto completo. */
  role: string;
  roles: string[];
  permissions: string[];
  email: string;
}

export interface TokenService {
  signAccessToken(claims: AccessClaims): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessClaims>;
  /** Gera um refresh token opaco de alta entropia (valor bruto, enviado ao cliente). */
  generateRefreshToken(): string;
  /** Hash determinístico (SHA-256) do refresh token para armazenamento. */
  hashToken(raw: string): string;
}
