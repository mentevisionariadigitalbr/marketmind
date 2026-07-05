import { ImpersonateCompanyUseCase } from './application/impersonate-company.use-case';
import { AdminImpersonationRepository, ImpersonationTarget } from './domain/ports/admin-impersonation.repository';
import { AccessClaims, TokenService } from '../iam/domain/ports/token-service.port';
import { AuditLogEntry, AuditLogRepository } from '../../shared/audit/audit-log.repository';
import { NotFoundError } from '../iam/application/errors';

class FakeRepo implements AdminImpersonationRepository {
  constructor(private readonly target: ImpersonationTarget | null) {}
  async findCompanyOwner() {
    return this.target;
  }
}

class CapturingTokens implements TokenService {
  signed: AccessClaims | null = null;
  async signAccessToken(claims: AccessClaims) {
    this.signed = claims;
    return 'tok';
  }
  async verifyAccessToken(): Promise<AccessClaims> {
    throw new Error('n/a');
  }
  generateRefreshToken() {
    return 'r';
  }
  hashToken() {
    return 'h';
  }
}

class CapturingAudit implements AuditLogRepository {
  entries: AuditLogEntry[] = [];
  async record(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

const TARGET: ImpersonationTarget = { userId: 'u-owner', email: 'owner@co.com', companyName: 'Loja' };

describe('ImpersonateCompanyUseCase', () => {
  it('emite token de tenant READ-ONLY marcado com o admin e audita o evento', async () => {
    const tokens = new CapturingTokens();
    const audit = new CapturingAudit();
    const uc = new ImpersonateCompanyUseCase(new FakeRepo(TARGET), tokens, audit);

    const res = await uc.execute({ adminId: 'admin-1', companyId: 'c1', ip: '1.2.3.4', userAgent: 'jest' });

    // Token: identidade do OWNER do tenant, porém readOnly + impersonatedBy.
    expect(tokens.signed).toMatchObject({
      sub: 'u-owner', companyId: 'c1', role: 'OWNER', readOnly: true, impersonatedBy: 'admin-1',
    });
    expect(tokens.signed!.permissions).toContain('iam:write');
    expect(res.accessToken).toBe('tok');
    expect(res.target).toMatchObject({ companyId: 'c1', userId: 'u-owner' });

    // Auditoria: quem (admin) entrou como quem (company/user) e quando.
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'admin.impersonate', userId: 'admin-1', companyId: 'c1',
      metadata: { impersonatedUserId: 'u-owner', readOnly: true },
    });
  });

  it('falha quando a empresa não tem usuário ativo', async () => {
    const uc = new ImpersonateCompanyUseCase(new FakeRepo(null), new CapturingTokens(), new CapturingAudit());
    await expect(uc.execute({ adminId: 'a', companyId: 'x', ip: null, userAgent: null })).rejects.toBeInstanceOf(NotFoundError);
  });
});
