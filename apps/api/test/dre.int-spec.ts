import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { PrismaDashboardQueryRepository } from '../src/modules/dashboard/infrastructure/prisma-dashboard-query.repository';
import { DashboardService } from '../src/modules/dashboard/application/dashboard.service';
import { InMemoryDashboardCache } from '../src/modules/dashboard/infrastructure/cache/in-memory-cache';
import { DashboardMetrics } from '../src/modules/dashboard/infrastructure/metrics/dashboard-metrics';
import { DreService } from '../src/modules/finance/application/dre.service';

/**
 * Integration (Fase 2, Inc.3): DRE consolidado. Critério de aceite —
 * lucro líquido do DRE bate com o KPI profit.net do Overview; trocar o regime
 * muda o imposto/lucro; período sem dados → zeros (não erro).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const A = '91111111-1111-1111-1111-111111111111';
const ACCOUNT = '91110000-0000-0000-0000-000000000001';
const PRODUCT = '91110001-0001-0001-0001-000000000001';
const now = new Date();
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

const asTenant = <T>(companyId: string, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId, userId: `${companyId}-u`, role: 'OWNER' }, fn);

describe('DRE (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let query: PrismaDashboardQueryRepository;
  let dre: DreService;

  async function clean(): Promise<void> {
    await owner.productCost.deleteMany({ where: { companyId: A } });
    await owner.expense.deleteMany({ where: { companyId: A } });
    await owner.taxRule.deleteMany({ where: { companyId: A } });
    await owner.orderItem.deleteMany({ where: { companyId: A } });
    await owner.order.deleteMany({ where: { companyId: A } });
    await owner.inventory.deleteMany({ where: { companyId: A } });
    await owner.productVariant.deleteMany({ where: { companyId: A } });
    await owner.product.deleteMany({ where: { companyId: A } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: A } });
    await owner.company.deleteMany({ where: { id: A } });
  }

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await clean();

    await owner.company.create({ data: { id: A, name: 'Co A', taxRegime: 'SIMPLES_NACIONAL' } });
    await owner.marketplaceAccount.create({ data: { id: ACCOUNT, companyId: A, marketplaceId: ml.id, externalUserId: 'a', accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) } });
    await owner.product.create({ data: { id: PRODUCT, companyId: A, marketplaceAccountId: ACCOUNT, externalId: 'A-1', sku: 'AAA-1', title: 'Prod', status: 'active', price: 100, categoryId: 'MLB-X' } });
    const variantId = randomUUID();
    await owner.productVariant.create({ data: { id: variantId, companyId: A, productId: PRODUCT, externalId: 'A-V', sku: 'AAA-1', price: 100 } });
    await owner.inventory.create({ data: { companyId: A, productId: PRODUCT, variantId, available: 10, reserved: 0 } });
    // Pedido no mês corrente: receita 1000, comissão 50, frete 30.
    const order = await owner.order.create({ data: { companyId: A, marketplaceAccountId: ACCOUNT, externalId: 'O-1', status: 'PAID', grossAmount: 1000, commissionAmount: 50, freightAmount: 30, orderedAt: monthStart } });
    await owner.orderItem.create({ data: { companyId: A, orderId: order.id, productId: PRODUCT, externalItemId: 'I-1', sku: 'AAA-1', title: 'Prod', quantity: 10, unitPrice: 100 } });
    // Custo unitário 40 (CMV = 400), despesa mensal 200, sem regra de imposto (default 6%).
    await owner.productCost.create({ data: { companyId: A, productId: PRODUCT, acquisitionCost: 40, validFrom: prevMonthStart } });
    await owner.expense.create({ data: { companyId: A, category: 'Aluguel', kind: 'FIXED', amount: 200, recurrence: 'MONTHLY', startsOn: prevMonthStart } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    query = new PrismaDashboardQueryRepository(prisma);
    dre = new DreService(query);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('monta a cascata do DRE com valores corretos', async () => {
    const r = await asTenant(A, () => dre.build({ preset: 'mtd' }));
    expect(r.grossRevenue).toBeCloseTo(1000);
    expect(r.deductions.total).toBeCloseTo(140); // 50 + 30 + 60 (imposto 6%)
    expect(r.cogs).toBeCloseTo(400);
    expect(r.operatingExpenses).toBeCloseTo(200);
    expect(r.netProfit).toBeCloseTo(260); // 1000 - 140 - 400 - 200
  });

  it('ACEITE: lucro líquido do DRE == KPI profit.net do Overview', async () => {
    const dreResult = await asTenant(A, () => dre.build({ preset: 'mtd' }));
    const overview = await asTenant(A, () =>
      new DashboardService(query, new InMemoryDashboardCache(), prisma, new DashboardMetrics()).overview(),
    );
    const net = overview.kpis.find((k) => k.key === 'profit.net');
    expect(net?.availability).toBe('available');
    expect(net?.value).toBeCloseTo(dreResult.netProfit);
    expect(net?.value).toBeCloseTo(260);
  });

  it('trocar o regime muda o imposto e o lucro líquido', async () => {
    await owner.company.update({ where: { id: A }, data: { taxRegime: 'LUCRO_PRESUMIDO' } });
    const r = await asTenant(A, () => dre.build({ preset: 'mtd' }));
    expect(r.deductions.taxes).toBeCloseTo(113.3); // 0.1133 × 1000
    expect(r.netProfit).toBeCloseTo(1000 - 50 - 30 - 113.3 - 400 - 200); // 206.7
    await owner.company.update({ where: { id: A }, data: { taxRegime: 'SIMPLES_NACIONAL' } });
  });

  it('período sem dados → zeros, sem erro', async () => {
    const r = await asTenant(A, () => dre.build({ preset: 'custom', from: '2023-01-01', to: '2023-02-01' }));
    expect(r.grossRevenue).toBe(0);
    expect(r.netProfit).toBe(0);
    expect(r.netMarginPct).toBe(0);
  });
});
