import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaAdminHealthRepository } from '../src/modules/admin/infrastructure/prisma-admin-health.repository';
import { PrismaAdminAuditRepository } from '../src/modules/admin/infrastructure/prisma-admin-audit.repository';

/** Integration (Fase 7, Inc.5): saúde (contas/jobs) + auditoria, cross-tenant. */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const CO = 'd4d4d4d4-bbbb-bbbb-bbbb-bbbbbbbbbb01';
const ACTION = `admin.test.${Date.now()}`;

describe('Admin ops — health + audit (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let health: PrismaAdminHealthRepository;
  let audit: PrismaAdminAuditRepository;
  let accountId: string;
  let jobId: string;

  const clean = async () => {
    await owner.marketplaceAccount.deleteMany({ where: { companyId: CO } });
    await owner.company.deleteMany({ where: { id: CO } });
    await owner.job.deleteMany({ where: { jobName: ACTION } });
    await owner.auditLog.deleteMany({ where: { action: ACTION } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await owner.company.create({ data: { id: CO, name: 'Co Saúde' } });
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: CO, marketplaceId: ml.id, externalUserId: 'ext', nickname: 'Loja X', accessTokenEnc: 'x', refreshTokenEnc: 'y', tokenExpiresAt: new Date(), status: 'EXPIRED' },
    });
    accountId = acc.id;
    const job = await owner.job.create({ data: { queue: 'ml.sync', jobName: ACTION, status: 'failed', attempts: 3, error: 'boom' } });
    jobId = job.id;
    await owner.auditLog.create({ data: { action: ACTION, method: 'POST', path: '/x', statusCode: 200, companyId: CO } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    health = new PrismaAdminHealthRepository(prisma);
    audit = new PrismaAdminAuditRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('saúde: conta EXPIRED aparece em "problematic" com nome da empresa; job failed listado', async () => {
    const h = await health.getHealth();
    expect(h.marketplaceAccounts.byStatus.EXPIRED).toBeGreaterThanOrEqual(1);
    const acc = h.marketplaceAccounts.problematic.find((a) => a.id === accountId);
    expect(acc).toBeDefined();
    expect(acc!.companyName).toBe('Co Saúde');
    expect(acc!.marketplace).toBe('MERCADO_LIVRE');

    expect(h.jobs.byStatus.failed).toBeGreaterThanOrEqual(1);
    expect(h.jobs.recentFailures.find((j) => j.id === jobId)?.error).toBe('boom');
  });

  it('auditoria: lista e filtra por ação', async () => {
    const page = await audit.list({ page: 1, pageSize: 50, action: ACTION });
    expect(page.total).toBe(1);
    expect(page.items[0].action).toBe(ACTION);
    expect(page.items[0].companyId).toBe(CO);
  });
});
