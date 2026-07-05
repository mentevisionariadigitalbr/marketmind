/**
 * Claims do token de admin de PLATAFORMA. Note a AUSÊNCIA de companyId/role de
 * tenant: o admin não pertence a nenhuma empresa. O `scope` fixo defende contra
 * confusão de tokens (além do segredo separado).
 */
export interface AdminClaims {
  /** id do platform_admin */
  sub: string;
  scope: 'platform';
  email: string;
}

export const PLATFORM_SCOPE = 'platform' as const;
