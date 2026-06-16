import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { PrismaAuditLogRepository } from '../src/shared/audit/prisma-audit-log.repository';
import { runWithTenant } from '../src/shared/tenant/tenant-context';

const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = '55555555-5555-5555-5555-555555555555';
const TENANT_B = '66666666-6666-6666-6666-666666666666';

describe('Audit log (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaAuditLogRepository;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await owner.auditLog.deleteMany({ where: { companyId: { in: [TENANT_A, TENANT_B] } } });
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaAuditLogRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner?.auditLog.deleteMany({ where: { companyId: { in: [TENANT_A, TENANT_B] } } });
    await owner?.$disconnect();
  });

  it('persiste a ação com ator, tenant e timestamp', async () => {
    await repo.record({
      companyId: TENANT_A,
      userId: '77777777-7777-7777-7777-777777777777',
      action: 'auth.login',
      method: 'POST',
      path: '/auth/login',
      statusCode: 200,
      ip: '1.2.3.4',
      userAgent: 'jest',
    });

    const rows = await owner.auditLog.findMany({ where: { companyId: TENANT_A } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'auth.login', userId: '77777777-7777-7777-7777-777777777777', statusCode: 200 });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it('leitura da trilha respeita o isolamento por tenant (RLS)', async () => {
    await repo.record({
      companyId: TENANT_B,
      userId: '88888888-8888-8888-8888-888888888888',
      action: 'auth.login',
      method: 'POST',
      path: '/auth/login',
      statusCode: 200,
      ip: null,
      userAgent: null,
    });

    const visibleToA = await runWithTenant(
      { companyId: TENANT_A, userId: '77777777-7777-7777-7777-777777777777', role: 'OWNER' },
      () => prisma.runInTransaction(() => prisma.db.auditLog.findMany()),
    );

    expect(visibleToA.every((r) => r.companyId === TENANT_A)).toBe(true);
    expect(visibleToA.some((r) => r.companyId === TENANT_B)).toBe(false);
  });
});
