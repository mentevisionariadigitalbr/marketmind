import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaAdminMetricsRepository } from '../src/modules/admin/infrastructure/prisma-admin-metrics.repository';
import { GetSaasMetricsUseCase } from '../src/modules/admin/application/get-saas-metrics.use-case';

/**
 * Integration (Fase 7, Inc.2): métricas de negócio lidas CROSS-TENANT (sem contexto
 * de tenant → RLS aberta). Usa um plano dedicado para uma asserção determinística que
 * prova a agregação por DUAS empresas distintas.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const PLAN_CODE = 'ADMIN_TEST_PLAN';
const X = 'a8a8a8a8-9999-9999-9999-999999999901';
const Y = 'a8a8a8a8-9999-9999-9999-999999999902';

describe('Admin SaaS metrics (integration, cross-tenant)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let useCase: GetSaasMetricsUseCase;
  let planId: string;

  const clean = async () => {
    await owner.subscription.deleteMany({ where: { companyId: { in: [X, Y] } } });
    await owner.company.deleteMany({ where: { id: { in: [X, Y] } } });
    await owner.plan.deleteMany({ where: { code: PLAN_CODE } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    const plan = await owner.plan.create({
      data: { code: PLAN_CODE, name: 'Admin Test', priceCents: 1000, interval: 'month' },
    });
    planId = plan.id;
    // Duas empresas distintas, ambas ACTIVE no plano dedicado.
    for (const id of [X, Y]) {
      await owner.company.create({ data: { id, name: `Co ${id.slice(-2)}` } });
      await owner.subscription.create({ data: { companyId: id, planId, status: 'ACTIVE' } });
    }

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    useCase = new GetSaasMetricsUseCase(new PrismaAdminMetricsRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('agrega assinaturas de MÚLTIPLAS empresas (RLS aberta para o admin)', async () => {
    const m = await useCase.execute();
    const mine = m.byPlan.find((p) => p.planCode === PLAN_CODE);
    expect(mine).toBeDefined();
    expect(mine!.activeCount).toBe(2); // X e Y — prova a leitura cross-tenant
    expect(mine!.mrrCents).toBe(2000);
    expect(m.activeSubscriptions).toBeGreaterThanOrEqual(2);
  });
});
