import { User, UserRole, UserStatus } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface CreateUserData {
  companyId: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  /** Vincula uma conta Google a um usuário existente (login social). */
  attachGoogleId(userId: string, googleId: string): Promise<User>;
  /** Atualiza dados de perfil do próprio usuário. */
  updateProfile(userId: string, data: { name: string }): Promise<User>;
  /** Troca o hash de senha. */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  /** Membros de uma empresa (para a tela de Equipe). */
  listByCompany(companyId: string): Promise<UserSummary[]>;
  /** Atualiza o papel (legacy) do usuário — sincronizado com o RBAC. */
  updateRole(userId: string, role: UserRole): Promise<User>;
  /** Guarda o convite (hash do token + validade) no usuário INVITED. */
  setInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Resolve um convite pelo hash do token (fluxo público de aceite). */
  findInviteByTokenHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null>;
  /** Ativa o usuário a partir do convite: define senha, ACTIVE e limpa o convite. */
  activateFromInvite(userId: string, passwordHash: string): Promise<void>;
}
