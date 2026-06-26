import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAdminTokenService } from './infrastructure/jwt-admin-token.service';
import { PlatformAdminGuard } from './presentation/http/platform-admin.guard';
import { AdminLoginUseCase } from './application/admin-login.use-case';
import { JwtTokenService } from '../iam/infrastructure/security/jwt-token.service';
import { JwtAuthGuard } from '../iam/presentation/http/jwt-auth.guard';
import { FakePasswordHasher } from '../iam/application/__fixtures__/in-memory.fixture';
import { InvalidCredentialsError } from '../iam/application/errors';
import { PlatformAdminRepository, PlatformAdminRecord } from './domain/ports/platform-admin.repository';
import { AdminTokenService } from './domain/ports/admin-token.service';
import { AdminClaims } from './domain/admin-claims';

const ADMIN_SECRET = 'admin-secret-32-bytes-minimum-xxxx';
const TENANT_SECRET = 'tenant-secret-32-bytes-minimum-xx';

function fakeConfig(values: Record<string, string>): ConfigService {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

function ctx(authorization?: string): ExecutionContext {
  const req = { headers: authorization ? { authorization } : {} } as {
    headers: Record<string, string | undefined>;
    user?: unknown;
  };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

const adminTokens = new JwtAdminTokenService(
  new JwtService({}),
  fakeConfig({ JWT_ADMIN_SECRET: ADMIN_SECRET, JWT_ADMIN_TTL: '1h' }),
);
const tenantTokens = new JwtTokenService(
  new JwtService({}),
  fakeConfig({ JWT_ACCESS_SECRET: TENANT_SECRET, JWT_ACCESS_TTL: '15m' }),
);

describe('Fronteira de segurança do admin', () => {
  const guard = new PlatformAdminGuard(adminTokens);

  it('aceita um token de admin válido', async () => {
    const token = await adminTokens.sign({ sub: 'admin-1', scope: 'platform', email: 'a@a.com' });
    await expect(guard.canActivate(ctx(`Bearer ${token}`))).resolves.toBe(true);
  });

  it('BLOQUEIA (403) um token de CLIENTE (assinado com o segredo de tenant)', async () => {
    const tenantToken = await tenantTokens.signAccessToken({
      sub: 'user-1', companyId: 'c1', role: 'OWNER', roles: ['OWNER'], permissions: ['iam:write'], email: 'u@u.com',
    });
    await expect(guard.canActivate(ctx(`Bearer ${tenantToken}`))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem token → 401', async () => {
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('o guard de TENANT rejeita um token de admin (não vaza para rotas de cliente)', async () => {
    const tenantGuard = new JwtAuthGuard(tenantTokens);
    const adminToken = await adminTokens.sign({ sub: 'admin-1', scope: 'platform', email: 'a@a.com' });
    await expect(tenantGuard.canActivate(ctx(`Bearer ${adminToken}`))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

// ───────── Login ─────────
class InMemoryAdminRepo implements PlatformAdminRepository {
  touched: string[] = [];
  constructor(private readonly admins: PlatformAdminRecord[]) {}
  async findByEmail(email: string) {
    return this.admins.find((a) => a.email === email) ?? null;
  }
  async touchLastLogin(id: string) {
    this.touched.push(id);
  }
}

class FakeAdminTokens implements AdminTokenService {
  async sign(claims: AdminClaims) {
    return `admin-token:${claims.sub}`;
  }
  async verify(): Promise<AdminClaims> {
    throw new Error('não usado');
  }
}

describe('AdminLoginUseCase', () => {
  const admin: PlatformAdminRecord = { id: 'a1', email: 'admin@mm.ai', name: 'Adm', passwordHash: 'hashed:s3nha-forte' };

  function make(repo = new InMemoryAdminRepo([admin])) {
    return { repo, uc: new AdminLoginUseCase(repo, new FakePasswordHasher(), new FakeAdminTokens()) };
  }

  it('emite token e marca lastLogin com credenciais válidas', async () => {
    const { repo, uc } = make();
    const res = await uc.execute({ email: 'admin@mm.ai', password: 's3nha-forte' });
    expect(res.accessToken).toBe('admin-token:a1');
    expect(res.admin.email).toBe('admin@mm.ai');
    expect(repo.touched).toEqual(['a1']);
  });

  it('rejeita senha errada (sem revelar)', async () => {
    const { uc } = make();
    await expect(uc.execute({ email: 'admin@mm.ai', password: 'errada' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejeita e-mail inexistente com o mesmo erro', async () => {
    const { uc } = make();
    await expect(uc.execute({ email: 'ninguem@mm.ai', password: 'x' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
