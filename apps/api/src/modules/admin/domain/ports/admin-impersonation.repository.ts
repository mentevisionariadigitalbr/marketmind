export const ADMIN_IMPERSONATION_REPOSITORY = Symbol('AdminImpersonationRepository');

export interface ImpersonationTarget {
  userId: string;
  email: string;
  companyName: string;
}

export interface AdminImpersonationRepository {
  /** Usuário-alvo da impersonação: o OWNER da empresa (fallback: qualquer ativo). */
  findCompanyOwner(companyId: string): Promise<ImpersonationTarget | null>;
}
