import { randomUUID } from 'node:crypto';
import { Company } from '../../domain/entities/company.entity';
import { User } from '../../domain/entities/user.entity';
import { CompanyRepository, CreateCompanyData, UpdateCompanyData } from '../../domain/ports/company.repository';
import { CreateUserData, UserRepository, UserSummary } from '../../domain/ports/user.repository';
import { UserRole } from '../../domain/entities/user.entity';
import {
  CreateRefreshTokenData,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import {
  IssueTokenData,
  UserTokenRepository,
  UserTokenType,
} from '../../domain/ports/user-token.repository';
import {
  LegalAcceptanceRecord,
  LegalAcceptanceRepository,
  RecordAcceptanceData,
} from '../../../legal/domain/ports/legal-acceptance.repository';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { AccessClaims, TokenService } from '../../domain/ports/token-service.port';
import { UnitOfWork } from '../../domain/ports/unit-of-work.port';
import {
  RbacRepository,
  RoleSummary,
  UserAuthorization,
} from '../../domain/ports/rbac.repository';
import {
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  SystemRoleName,
} from '../../domain/permissions';

export class InMemoryCompanyRepository implements CompanyRepository {
  readonly items: Company[] = [];

  async create(data: CreateCompanyData): Promise<Company> {
    const now = new Date();
    const company = new Company({
      id: randomUUID(),
      name: data.name,
      taxId: data.taxId ?? null,
      taxRegime: data.taxRegime ?? 'SIMPLES_NACIONAL',
      createdAt: now,
      updatedAt: now,
    });
    this.items.push(company);
    return company;
  }

  async findById(id: string): Promise<Company | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    const index = this.items.findIndex((c) => c.id === id);
    const current = this.items[index].toJSON();
    const updated = new Company({
      ...current,
      name: data.name ?? current.name,
      taxId: data.taxId !== undefined ? data.taxId : current.taxId,
      taxRegime: data.taxRegime ?? current.taxRegime,
      updatedAt: new Date(),
    });
    this.items[index] = updated;
    return updated;
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly items: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.items.find((u) => u.id === id) ?? null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.items.find((u) => u.googleId === googleId) ?? null;
  }

  async attachGoogleId(userId: string, googleId: string): Promise<User> {
    const index = this.items.findIndex((u) => u.id === userId);
    const current = this.items[index];
    const updated = new User({
      id: current.id,
      companyId: current.companyId,
      name: current.name,
      email: current.email,
      passwordHash: current.passwordHash,
      googleId,
      role: current.role,
      status: current.status,
      emailVerifiedAt: current.emailVerifiedAt,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });
    this.items[index] = updated;
    return updated;
  }

  async create(data: CreateUserData): Promise<User> {
    const now = new Date();
    const user = new User({
      id: randomUUID(),
      companyId: data.companyId,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      googleId: data.googleId ?? null,
      role: data.role ?? 'OWNER',
      status: data.status ?? 'ACTIVE',
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    this.items.push(user);
    return user;
  }

  private readonly invites = new Map<string, { tokenHash: string; expiresAt: Date }>();

  private replace(
    userId: string,
    patch: Partial<{ name: string; passwordHash: string | null; role: UserRole; status: 'ACTIVE' | 'INVITED' | 'DISABLED'; emailVerifiedAt: Date | null }>,
  ): User {
    const index = this.items.findIndex((u) => u.id === userId);
    const c = this.items[index];
    const updated = new User({
      id: c.id,
      companyId: c.companyId,
      name: patch.name ?? c.name,
      email: c.email,
      passwordHash: patch.passwordHash !== undefined ? patch.passwordHash : c.passwordHash,
      googleId: c.googleId,
      role: patch.role ?? c.role,
      status: patch.status ?? c.status,
      emailVerifiedAt: patch.emailVerifiedAt !== undefined ? patch.emailVerifiedAt : c.emailVerifiedAt,
      createdAt: c.createdAt,
      updatedAt: new Date(),
    });
    this.items[index] = updated;
    return updated;
  }

  async updateProfile(userId: string, data: { name: string }): Promise<User> {
    return this.replace(userId, { name: data.name });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    this.replace(userId, { passwordHash });
  }

  async markEmailVerified(userId: string): Promise<void> {
    this.replace(userId, { emailVerifiedAt: new Date() });
  }

  async listByCompany(companyId: string): Promise<UserSummary[]> {
    return this.items
      .filter((u) => u.companyId === companyId)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status }));
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    return this.replace(userId, { role });
  }

  async setInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.invites.set(userId, { tokenHash, expiresAt });
  }

  async findInviteByTokenHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null> {
    for (const [userId, inv] of this.invites) {
      if (inv.tokenHash === tokenHash) return { userId, expiresAt: inv.expiresAt };
    }
    return null;
  }

  async activateFromInvite(userId: string, passwordHash: string): Promise<void> {
    this.replace(userId, { passwordHash, status: 'ACTIVE' });
    this.invites.delete(userId);
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly items: RefreshTokenRecord[] = [];

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
    };
    this.items.push(record);
    return record;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.items.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async revoke(id: string, replacedByTokenId?: string | null): Promise<void> {
    const record = this.items.find((t) => t.id === id);
    if (record) {
      record.revokedAt = new Date();
      record.replacedByTokenId = replacedByTokenId ?? null;
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.items) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = new Date();
      }
    }
  }
}

/** Tokens de uso único em memória (reset/verify). */
export class InMemoryUserTokenRepository implements UserTokenRepository {
  readonly tokens: { userId: string; companyId: string; type: UserTokenType; tokenHash: string; expiresAt: Date; usedAt: Date | null }[] = [];

  async issue(data: IssueTokenData): Promise<void> {
    // Invalida anteriores do mesmo tipo.
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      if (this.tokens[i].userId === data.userId && this.tokens[i].type === data.type) this.tokens.splice(i, 1);
    }
    this.tokens.push({ ...data, usedAt: null });
  }

  async consume(tokenHash: string, type: UserTokenType): Promise<{ userId: string } | null> {
    const t = this.tokens.find(
      (x) => x.tokenHash === tokenHash && x.type === type && x.usedAt === null && x.expiresAt.getTime() > Date.now(),
    );
    if (!t) return null;
    t.usedAt = new Date();
    return { userId: t.userId };
  }
}

/** Aceites legais em memória (prova de consentimento nos testes). */
export class InMemoryLegalAcceptanceRepository implements LegalAcceptanceRepository {
  readonly items: (RecordAcceptanceData & { acceptedAt: Date })[] = [];

  async record(data: RecordAcceptanceData): Promise<void> {
    this.items.push({ ...data, acceptedAt: new Date() });
  }

  async listForUser(userId: string): Promise<LegalAcceptanceRecord[]> {
    return this.items
      .filter((i) => i.userId === userId)
      .map((i) => ({ documentType: i.documentType, version: i.version, acceptedAt: i.acceptedAt }));
  }
}

/** Hasher determinístico para testes (NÃO use em produção). */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(hash: string, plain: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

/** Token service falso: tokens previsíveis e inspecionáveis. */
export class FakeTokenService implements TokenService {
  private counter = 0;

  async signAccessToken(claims: AccessClaims): Promise<string> {
    return `access.${claims.sub}`;
  }
  async verifyAccessToken(token: string): Promise<AccessClaims> {
    const sub = token.replace('access.', '');
    return {
      sub,
      companyId: 'c',
      role: 'OWNER',
      roles: ['OWNER'],
      permissions: SYSTEM_ROLE_PERMISSIONS.OWNER,
      email: 'x@x.com',
    };
  }
  generateRefreshToken(): string {
    this.counter += 1;
    return `refresh-${this.counter}-${randomUUID()}`;
  }
  hashToken(raw: string): string {
    return `h:${raw}`;
  }
}

/** UoW falso: executa o trabalho sem transação real. */
export class FakeUnitOfWork implements UnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}

/** RBAC em memória: registra atribuições e resolve permissões pelo catálogo de sistema. */
export class InMemoryRbacRepository implements RbacRepository {
  /** userId -> conjunto de papéis (de sistema) atribuídos. */
  readonly assignments = new Map<string, Set<string>>();

  async getEffectiveAuthorization(userId: string): Promise<UserAuthorization> {
    const roles = [...(this.assignments.get(userId) ?? [])];
    const permissions = new Set<string>();
    for (const role of roles) {
      for (const perm of SYSTEM_ROLE_PERMISSIONS[role as SystemRoleName] ?? []) {
        permissions.add(perm);
      }
    }
    return { roles, permissions: [...permissions] };
  }

  async assignSystemRole(userId: string, roleName: string): Promise<void> {
    const set = this.assignments.get(userId) ?? new Set<string>();
    set.add(roleName);
    this.assignments.set(userId, set);
  }

  async setSystemRole(userId: string, roleName: string): Promise<void> {
    this.assignments.set(userId, new Set([roleName]));
  }

  async listRoles(): Promise<RoleSummary[]> {
    return (Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[]).map((name) => ({
      id: name,
      name,
      description: null,
      isSystem: true,
      permissions: SYSTEM_ROLE_PERMISSIONS[name],
    }));
  }
}

/** RBAC pré-configurado para um conjunto fixo de permissões (atalho de teste). */
export function rbacWith(roleName: SystemRoleName = SYSTEM_ROLES.OWNER): InMemoryRbacRepository {
  const repo = new InMemoryRbacRepository();
  // Atribuição preguiçosa: qualquer usuário consultado recebe o papel informado.
  const original = repo.getEffectiveAuthorization.bind(repo);
  repo.getEffectiveAuthorization = async (userId: string) => {
    if (!repo.assignments.has(userId)) {
      await repo.assignSystemRole(userId, roleName);
    }
    return original(userId);
  };
  return repo;
}
