import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { ExpenseService } from '../src/modules/finance/application/expense.service';
import { PrismaExpenseRepository } from '../src/modules/finance/infrastructure/prisma-expense.repository';
import { PrismaDashboardQueryRepository } from '../src/modules/dashboard/infrastructure/prisma-dashboard-query.repository';

/**
 * Integration (Fase 2, Inc.1): despesas com RLS + expansão de recorrência no
 * getOperatingExpenses, contra Postgres real.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = 'e1111111-1111-1111-1111-111111111111';
const TENANT_B = 'f2222222-2222-2222-2222-222222222222';
const Q1 = { from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-04-01T00:00:00Z') }; // Jan, Feb, Mar

const asTenant = <T>(companyId: string, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId, userId: `${companyId}-u`, role: 'OWNER' }, fn);

describe('Expenses (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let service: ExpenseService;
  let query: PrismaDashboardQueryRepository;

  const clean = () => owner.expense.deleteMany({ where: { companyId: { in: [TENANT_A, TENANT_B] } } });

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    for (const id of [TENANT_A, TENANT_B]) {
      await owner.company.upsert({ where: { id }, create: { id, name: `Co ${id.slice(0, 4)}` }, update: {} });
    }
    await clean();
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    service = new ExpenseService(new PrismaExpenseRepository(prisma));
    query = new PrismaDashboardQueryRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.company.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await owner.$disconnect();
  });

  it('RLS: despesa do tenant A é invisível ao tenant B', async () => {
    await clean();
    await asTenant(TENANT_A, () => service.create({ category: 'Aluguel', kind: 'FIXED', amount: 1000, recurrence: 'MONTHLY', startsOn: '2025-01-01T00:00:00Z' }));
    const a = await asTenant(TENANT_A, () => service.list(1, 20, {}));
    const b = await asTenant(TENANT_B, () => service.list(1, 20, {}));
    expect(a.total).toBe(1);
    expect(b.total).toBe(0);
  });

  it('getOperatingExpenses expande recorrência mensal no período', async () => {
    await clean();
    await asTenant(TENANT_A, () => service.create({ category: 'Aluguel', kind: 'FIXED', amount: 1000, recurrence: 'MONTHLY', startsOn: '2025-01-01T00:00:00Z' }));
    await asTenant(TENANT_A, () => service.create({ category: 'Anúncio pontual', kind: 'VARIABLE', amount: 300, recurrence: 'NONE', startsOn: '2026-02-15T00:00:00Z' }));
    const total = await asTenant(TENANT_A, () => query.getOperatingExpenses(Q1));
    expect(total).toBe(3300); // 3×1000 (mensal) + 300 (avulso em fev)
  });

  it('getOperatingExpenses é tenant-scoped (B não vê despesa de A)', async () => {
    const totalB = await asTenant(TENANT_B, () => query.getOperatingExpenses(Q1));
    expect(totalB).toBe(0);
  });

  it('delete remove o lançamento', async () => {
    await clean();
    const created = await asTenant(TENANT_A, () => service.create({ category: 'Ferramenta', kind: 'FIXED', amount: 99, recurrence: 'MONTHLY', startsOn: '2026-01-01T00:00:00Z' }));
    const ok = await asTenant(TENANT_A, () => service.delete(created.id));
    const after = await asTenant(TENANT_A, () => service.list(1, 20, {}));
    expect(ok).toBe(true);
    expect(after.total).toBe(0);
  });
});
