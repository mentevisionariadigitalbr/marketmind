import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { PrismaDashboardQueryRepository } from '../src/modules/dashboard/infrastructure/prisma-dashboard-query.repository';
import { InMemoryDashboardCache } from '../src/modules/dashboard/infrastructure/cache/in-memory-cache';
import { DashboardMetrics } from '../src/modules/dashboard/infrastructure/metrics/dashboard-metrics';
import { DashboardService } from '../src/modules/dashboard/application/dashboard.service';
import { FinanceService } from '../src/modules/finance/application/finance.service';
import { PrismaProductCostRepository } from '../src/modules/finance/infrastructure/prisma-product-cost.repository';

/**
 * Integration test da Fase 1 (Custos) contra Postgres real, sob RLS:
 * RLS de product_costs · cadastrar custo destrava lucro bruto · valueAtCost ·
 * custo histórico (valid_from no passado aplica ao COGS do período).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = 'c1111111-1111-1111-1111-111111111111';
const TENANT_B = 'd2222222-2222-2222-2222-222222222222';
const ACCOUNT_A = 'c1110000-0000-0000-0000-000000000001';
const ACCOUNT_B = 'd2220000-0000-0000-0000-000000000001';
const PRODUCT_A = 'c1110001-0001-0001-0001-000000000001';

const ago = (ms: number) => new Date(Date.now() - ms);
const range35d = { from: ago(35 * 86_400_000), to: new Date(Date.now() + 86_400_000) };

const asTenant = <T>(companyId: string, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId, userId: `${companyId}-u`, role: 'OWNER' }, fn);

describe('Finance / Custos (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let query: PrismaDashboardQueryRepository;
  let finance: FinanceService;

  async function clean(): Promise<void> {
    for (const c of [TENANT_A, TENANT_B]) {
      await owner.productCost.deleteMany({ where: { companyId: c } });
      await owner.orderItem.deleteMany({ where: { companyId: c } });
      await owner.order.deleteMany({ where: { companyId: c } });
      await owner.inventory.deleteMany({ where: { companyId: c } });
      await owner.productVariant.deleteMany({ where: { companyId: c } });
      await owner.product.deleteMany({ where: { companyId: c } });
      await owner.marketplaceAccount.deleteMany({ where: { companyId: c } });
      await owner.company.deleteMany({ where: { id: c } });
    }
  }

  const clearCosts = () => owner.productCost.deleteMany({ where: { companyId: TENANT_A } });
  const countCosts = (companyId: string) =>
    asTenant(companyId, () =>
      prisma.runInTransaction(async () => {
        const [r] = await prisma.db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM product_costs`;
        return r.n;
      }),
    );

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await clean();

    // Tenant A: 1 produto (AAA-1, preço 100), estoque 10, 1 pedido de 5 un (receita 500) há 1h.
    await owner.company.create({ data: { id: TENANT_A, name: 'Co A' } });
    await owner.marketplaceAccount.create({ data: { id: ACCOUNT_A, companyId: TENANT_A, marketplaceId: ml.id, externalUserId: 'a', accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) } });
    await owner.product.create({ data: { id: PRODUCT_A, companyId: TENANT_A, marketplaceAccountId: ACCOUNT_A, externalId: 'A-EXT-1', sku: 'AAA-1', title: 'Camiseta', status: 'active', price: 100 } });
    const variantId = randomUUID();
    await owner.productVariant.create({ data: { id: variantId, companyId: TENANT_A, productId: PRODUCT_A, externalId: 'A-VAR-1', sku: 'AAA-1', price: 100 } });
    await owner.inventory.create({ data: { companyId: TENANT_A, productId: PRODUCT_A, variantId, available: 10, reserved: 0 } });
    const order = await owner.order.create({ data: { companyId: TENANT_A, marketplaceAccountId: ACCOUNT_A, externalId: 'A-ORD-1', status: 'PAID', grossAmount: 500, freightAmount: 10, commissionAmount: 50, orderedAt: ago(3_600_000) } });
    await owner.orderItem.create({ data: { companyId: TENANT_A, orderId: order.id, productId: PRODUCT_A, externalItemId: 'A-ITEM-1', sku: 'AAA-1', title: 'Camiseta', quantity: 5, unitPrice: 100 } });

    // Tenant B: 1 produto (sem pedidos/custos).
    await owner.company.create({ data: { id: TENANT_B, name: 'Co B' } });
    await owner.marketplaceAccount.create({ data: { id: ACCOUNT_B, companyId: TENANT_B, marketplaceId: ml.id, externalUserId: 'b', accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) } });
    await owner.product.create({ data: { companyId: TENANT_B, marketplaceAccountId: ACCOUNT_B, externalId: 'B-EXT-1', sku: 'BBB-1', title: 'Tênis', status: 'active', price: 300 } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    query = new PrismaDashboardQueryRepository(prisma);
    finance = new FinanceService(new PrismaProductCostRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner?.$disconnect();
  });

  it('RLS: custo do tenant A é invisível ao tenant B', async () => {
    await clearCosts();
    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 40 }));
    expect(await countCosts(TENANT_A)).toBe(1);
    expect(await countCosts(TENANT_B)).toBe(0); // RLS isola
  });

  it('cadastrar custo destrava o COGS (cobertura 0 → 1)', async () => {
    await clearCosts();
    const before = await asTenant(TENANT_A, () => query.getCogs(range35d));
    expect(before.coveragePct).toBe(0);
    expect(before.cogs).toBe(0);

    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 40 }));
    const after = await asTenant(TENANT_A, () => query.getCogs(range35d));
    expect(after.coveragePct).toBe(1);
    expect(after.cogs).toBeCloseTo(200); // 5 × 40
    expect(after.coveredRevenue).toBeCloseTo(500);
  });

  it('overview: com custo, profit.gross fica available com valor correto', async () => {
    await clearCosts();
    const before = await asTenant(TENANT_A, () =>
      new DashboardService(query, new InMemoryDashboardCache(), prisma, new DashboardMetrics()).overview(),
    );
    expect(before.kpis.find((k) => k.key === 'profit.gross')?.availability).toBe('needs-table');

    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 40 }));
    const after = await asTenant(TENANT_A, () =>
      new DashboardService(query, new InMemoryDashboardCache(), prisma, new DashboardMetrics()).overview(),
    );
    const gross = after.kpis.find((k) => k.key === 'profit.gross');
    expect(gross?.availability).toBe('available');
    expect(gross?.value).toBeCloseTo(300); // 500 − 200
    expect(after.costCoveragePct).toBe(1);
  });

  it('valueAtCost reflete estoque × custo vigente', async () => {
    await clearCosts();
    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 40 }));
    const inv = await asTenant(TENANT_A, () => query.getInventorySummary());
    expect(inv.valueAtCost).toBeCloseTo(400); // 10 × 40
    expect(inv.valueAtCostCoveragePct).toBeCloseTo(1);
  });

  it('custo histórico: valid_from no passado é aplicado ao COGS do período', async () => {
    await clearCosts();
    // Custo antigo (vigente na data do pedido) = 30; custo novo (hoje) = 50.
    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 30, validFrom: ago(10 * 86_400_000).toISOString() }));
    await asTenant(TENANT_A, () => finance.upsertCost(PRODUCT_A, { acquisitionCost: 50, validFrom: new Date().toISOString() }));
    const cogs = await asTenant(TENANT_A, () => query.getCogs(range35d));
    // Pedido foi há 1h → usa o custo de 30 (vigente então), não o de 50.
    expect(cogs.cogs).toBeCloseTo(150); // 5 × 30
  });
});
