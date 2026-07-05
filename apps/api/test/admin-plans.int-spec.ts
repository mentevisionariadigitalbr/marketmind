import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaAdminPlansRepository } from '../src/modules/admin/infrastructure/prisma-admin-plans.repository';
import { PlanCodeInUseError } from '../src/modules/admin/domain/errors';

/** Integration (Fase 7, Inc.4): CRUD de planos (tabela global) contra Postgres. */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const CODE = 'ADMIN_CRUD_TEST';

describe('Admin plans CRUD (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaAdminPlansRepository;

  const clean = async () => {
    await owner.plan.deleteMany({ where: { code: CODE } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaAdminPlansRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('cria, lê, atualiza e desativa um plano', async () => {
    const created = await repo.create({
      code: CODE, name: 'CRUD', priceCents: 4900, currency: 'BRL', interval: 'month',
      trialDays: 7, maxMarketplaceAccounts: 1, maxProducts: null, historyWindowDays: 90, stripePriceId: null,
    });
    expect(created.code).toBe(CODE);
    expect(created.maxProducts).toBeNull();

    const found = await repo.findById(created.id);
    expect(found?.priceCents).toBe(4900);

    const all = await repo.listAll();
    expect(all.some((p) => p.code === CODE)).toBe(true);

    const updated = await repo.update(created.id, { priceCents: 5900, active: false });
    expect(updated?.priceCents).toBe(5900);
    expect(updated?.active).toBe(false);
  });

  it('rejeita código duplicado (409)', async () => {
    await expect(
      repo.create({
        code: CODE, name: 'Dup', priceCents: 1, currency: 'BRL', interval: 'month',
        trialDays: 0, maxMarketplaceAccounts: null, maxProducts: null, historyWindowDays: null, stripePriceId: null,
      }),
    ).rejects.toBeInstanceOf(PlanCodeInUseError);
  });

  it('update de plano inexistente é nulo', async () => {
    expect(await repo.update('00000000-0000-0000-0000-000000000000', { priceCents: 1 })).toBeNull();
  });
});
