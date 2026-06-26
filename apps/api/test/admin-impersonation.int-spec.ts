import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@marketmind/kernel';
import { PrismaAdminImpersonationRepository } from '../src/modules/admin/infrastructure/prisma-admin-impersonation.repository';
import { ImpersonateCompanyUseCase } from '../src/modules/admin/application/impersonate-company.use-case';
import { JwtTokenService } from '../src/modules/iam/infrastructure/security/jwt-token.service';
import { PrismaAuditLogRepository } from '../src/shared/audit/prisma-audit-log.repository';

/**
 * Integration (Fase 7, Inc.6): impersonação emite um token de tenant READ-ONLY
 * verificável e grava a auditoria (quem entrou como quem, quando).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const CO = 'e5e5e5e5-cccc-cccc-cccc-cccccccccc01';
const OWNER_USER = 'e5e5e5e5-cccc-cccc-cccc-cccccccccca1';
const ADMIN_ID = 'e5e5e5e5-cccc-cccc-cccc-cccccccccc99';

function config(): ConfigService {
  return { get: (k: string) => ({ JWT_ACCESS_SECRET: 'tenant-secret-32-bytes-minimum-xx', JWT_ACCESS_TTL: '15m' })[k] } as unknown as ConfigService;
}

describe('Admin impersonation (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let tokens: JwtTokenService;
  let useCase: ImpersonateCompanyUseCase;

  const clean = async () => {
    await owner.auditLog.deleteMany({ where: { companyId: CO } });
    await owner.user.deleteMany({ where: { companyId: CO } });
    await owner.company.deleteMany({ where: { id: CO } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    await owner.company.create({ data: { id: CO, name: 'Loja Impersonada' } });
    await owner.user.create({ data: { id: OWNER_USER, companyId: CO, name: 'Dona', email: 'dona@co.com', passwordHash: 'h', role: 'OWNER', status: 'ACTIVE' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    tokens = new JwtTokenService(new JwtService({}), config());
    useCase = new ImpersonateCompanyUseCase(
      new PrismaAdminImpersonationRepository(prisma),
      tokens,
      new PrismaAuditLogRepository(prisma),
    );
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('emite token READ-ONLY do OWNER e registra a auditoria', async () => {
    const res = await useCase.execute({ adminId: ADMIN_ID, companyId: CO, ip: '9.9.9.9', userAgent: 'jest' });

    const claims = await tokens.verifyAccessToken(res.accessToken);
    expect(claims.sub).toBe(OWNER_USER);
    expect(claims.companyId).toBe(CO);
    expect(claims.readOnly).toBe(true);
    expect(claims.impersonatedBy).toBe(ADMIN_ID);

    const log = await owner.auditLog.findFirst({ where: { action: 'admin.impersonate', companyId: CO } });
    expect(log).not.toBeNull();
    expect(log!.userId).toBe(ADMIN_ID);
    expect((log!.metadata as { impersonatedUserId?: string }).impersonatedUserId).toBe(OWNER_USER);
  });
});
