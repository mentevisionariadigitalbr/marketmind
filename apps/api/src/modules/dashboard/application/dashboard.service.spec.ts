import { runWithTenant } from '@marketmind/kernel';
import { DashboardService } from './dashboard.service';
import { DashboardMetrics } from '../infrastructure/metrics/dashboard-metrics';
import { InMemoryDashboardCache } from '../infrastructure/cache/in-memory-cache';
import type {
  DashboardQueryPort,
  RevenueAggregate,
  InventorySummary,
  ProductRevenueRow,
  ProductSignal,
} from '@marketmind/dashboard-core';

/** PrismaService falso: runInTransaction apenas executa o trabalho. */
const fakePrisma = { runInTransaction: <T>(work: () => Promise<T>) => work() } as never;

function revenue(over: Partial<RevenueAggregate> = {}): RevenueAggregate {
  return { revenue: 1000, orders: 10, unitsSold: 20, commission: 100, freight: 50, distinctCustomers: 8, ...over };
}

function makeQuery(over: Partial<DashboardQueryPort> = {}): { port: DashboardQueryPort; calls: { revenue: number } } {
  const calls = { revenue: 0 };
  const inv: InventorySummary = {
    activeProducts: 12,
    productsWithoutStock: 3,
    criticalStock: 2,
    totalUnitsOnHand: 500,
    valueAtPrice: 25000,
    valueAtCost: 15000,
    valueAtCostCoveragePct: 0.6,
    averageInventoryUnits: 500,
  };
  const products: ProductRevenueRow[] = [
    { productId: 'a', sku: 'A', title: 'A', revenue: 800, unitsSold: 8 },
    { productId: 'b', sku: 'B', title: 'B', revenue: 150, unitsSold: 5 },
    { productId: 'c', sku: 'C', title: 'C', revenue: 50, unitsSold: 2 },
  ];
  const port: DashboardQueryPort = {
    getRevenue: async () => {
      calls.revenue++;
      return revenue();
    },
    getCogs: async () => ({ cogs: 600, coveredRevenue: 1000, coveragePct: 1 }),
    getTimeline: async () => [{ bucket: '2026-06-14', revenue: 500, orders: 5, unitsSold: 10 }],
    getTopProducts: async (_r, limit) => products.slice(0, limit),
    getProductRevenue: async () => products,
    getTopCategories: async () => [{ categoryId: 'cat1', name: 'Cat 1', revenue: 1000, unitsSold: 15, productCount: 4 }],
    getCategoryBreakdown: async () => [{ categoryId: 'cat1', name: 'Cat 1', revenue: 1000, unitsSold: 15, productCount: 4 }],
    listProducts: async (_f, page) => ({ items: products.map((p) => ({ ...p, thumbnail: null, categoryId: 'c', status: 'active', price: 10, stock: 5, profit: null, marginPct: null })), page: page.page, pageSize: page.pageSize, total: 3 }),
    getInventorySummary: async () => inv,
    getProductSignals: async (): Promise<ProductSignal[]> => [
      { productId: 'a', sku: 'A', title: 'A', stock: 0, status: 'active', unitsSoldCurrent: 0, unitsSoldPrevious: 5, marginPct: null },
    ],
    ...over,
  };
  return { port, calls };
}

function buildService(over: Partial<DashboardQueryPort> = {}) {
  const cache = new InMemoryDashboardCache();
  const metrics = new DashboardMetrics();
  const { port, calls } = makeQuery(over);
  const service = new DashboardService(port, cache, fakePrisma, metrics);
  return { service, cache, metrics, calls };
}

const TENANT = { companyId: 'company-1', userId: 'user-1', role: 'OWNER' };

describe('DashboardService', () => {
  it('overview retorna os 12 cards executivos', async () => {
    const { service } = buildService();
    const result = await runWithTenant(TENANT, () => service.overview());
    expect(result.kpis).toHaveLength(12);
    const keys = result.kpis.map((k) => k.key);
    expect(keys).toContain('revenue.today');
    expect(keys).toContain('growth.rate');
    expect(keys).toContain('inventory.criticalStock');
  });

  it('Fase 1: com custo, lucro bruto fica available; lucro líquido segue needs-table', async () => {
    const { service } = buildService();
    const result = await runWithTenant(TENANT, () => service.overview());
    const gross = result.kpis.find((k) => k.key === 'profit.gross');
    const net = result.kpis.find((k) => k.key === 'profit.net');
    expect(gross?.availability).toBe('available'); // coverage 1 (fake)
    expect(gross?.value).toBeCloseTo(400); // grossProfit(1000, 600)
    expect(net?.availability).toBe('needs-table');
    expect(net?.value).toBe(0);
    expect(result.costCoveragePct).toBe(1);
  });

  it('sem custo (cobertura 0): lucro bruto volta a needs-table, value 0', async () => {
    const { service } = buildService({ getCogs: async () => ({ cogs: 0, coveredRevenue: 0, coveragePct: 0 }) });
    const result = await runWithTenant(TENANT, () => service.overview());
    const gross = result.kpis.find((k) => k.key === 'profit.gross');
    expect(gross?.availability).toBe('needs-table');
    expect(gross?.value).toBe(0);
  });

  it('cacheia: segunda chamada não consulta a porta novamente', async () => {
    const { service, calls } = buildService();
    await runWithTenant(TENANT, () => service.overview());
    const afterFirst = calls.revenue;
    await runWithTenant(TENANT, () => service.overview());
    expect(calls.revenue).toBe(afterFirst); // hit de cache
  });

  it('isola por tenant: empresas diferentes têm chaves de cache distintas', async () => {
    const { service, calls } = buildService();
    await runWithTenant(TENANT, () => service.overview());
    const afterT1 = calls.revenue;
    await runWithTenant({ ...TENANT, companyId: 'company-2' }, () => service.overview());
    expect(calls.revenue).toBeGreaterThan(afterT1); // miss para outro tenant
  });

  it('revenue calcula ticket médio e margem de contribuição', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.revenue({ preset: '30d' }));
    expect(r.averageTicket).toBeCloseTo(100); // 1000/10
    expect(r.contributionMarginPct).toBeCloseTo(0.85); // (1000-100-50)/1000
  });

  it('abc classifica e conta classes', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.abc({ preset: '30d' }));
    expect(r.entries.length).toBe(3);
    expect(r.counts.A + r.counts.B + r.counts.C).toBe(3);
  });

  it('top-products calcula sharePct sobre a receita total', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.topProducts({ preset: '30d' }, 2));
    expect(r).toHaveLength(2);
    expect(r[0].sharePct).toBeCloseTo(0.8); // 800/1000
  });

  it('alerts detecta out-of-stock e conta severidades', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.alerts({ preset: '30d' }));
    expect(r.alerts.some((a) => a.type === 'out-of-stock')).toBe(true);
    expect(r.counts.critical).toBeGreaterThanOrEqual(1);
  });

  it('inventory: com custo expõe valueAtCost + cobertura; giro > 0', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.inventory({ preset: '30d' }));
    expect(r.valueAtCost).toBe(15000); // fake coverage 0.6 > 0
    expect(r.valueAtCostCoveragePct).toBeCloseTo(0.6);
    expect(r.turnover).toBeGreaterThan(0);
  });

  it('inventory: sem custo em estoque (cobertura 0) → valueAtCost null', async () => {
    const { service } = buildService({
      getInventorySummary: async () => ({
        activeProducts: 1, productsWithoutStock: 0, criticalStock: 0, totalUnitsOnHand: 10,
        valueAtPrice: 100, valueAtCost: 0, valueAtCostCoveragePct: 0, averageInventoryUnits: 10,
      }),
    });
    const r = await runWithTenant(TENANT, () => service.inventory({ preset: '30d' }));
    expect(r.valueAtCost).toBeNull();
  });

  it('products pagina e calcula totalPages', async () => {
    const { service } = buildService();
    const r = await runWithTenant(TENANT, () => service.products({ preset: '30d' }, {}, { page: 1, pageSize: 2 }));
    expect(r.total).toBe(3);
    expect(r.totalPages).toBe(2);
  });

  it('métricas registram cache miss e depois hit', async () => {
    const { service, metrics } = buildService();
    await runWithTenant(TENANT, () => service.overview());
    await runWithTenant(TENANT, () => service.overview());
    const dump = await metrics.expose();
    expect(dump).toContain('dashboard_cache_misses');
    expect(dump).toContain('dashboard_cache_hits');
    expect(dump).toContain('dashboard_requests_total');
  });
});
