export const RBAC_REPOSITORY = Symbol('RbacRepository');

export interface UserAuthorization {
  roles: string[];
  permissions: string[];
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface RbacRepository {
  /** União de papéis e permissões efetivas do usuário (para claims do token). */
  getEffectiveAuthorization(userId: string): Promise<UserAuthorization>;

  /** Atribui um papel de sistema (companyId = null) ao usuário. Idempotente. */
  assignSystemRole(userId: string, roleName: string): Promise<void>;

  /** Papéis disponíveis para a empresa (sistema + personalizados). */
  listRoles(companyId: string): Promise<RoleSummary[]>;
}
