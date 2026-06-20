import { Inject, Injectable } from '@nestjs/common';
import {
  KPI_CATALOG,
  averageTicket,
  contributionMarginPct,
  growthRate,
  inventoryTurnover,
  stockCoverageDays,
  salesVelocity,
  classifyAbc,
  detectAlerts,
  DEFAULT_ALERT_RULES,
  computeTrend,
  grossProfit,
  grossMarginPct,
  rangeDays,
  type KpiKey,
  type KpiValue,
  type KpiAvailability,
  type DashboardQueryPort,
  type RevenueAggregate,
  type CogsResult,
  type ProductListFilter,
  type PageRequest,
  type RevenueDTO,
  type TimelinePointDTO,
  type CategoryDTO,
  type AbcDTO,
  type InventoryDTO,
  type AlertsDTO,
  type ProductsPageDTO,
  type DashboardHealthDTO,
  type TopProductDTO,
} from '@marketmind/dashboard-core';

import { PrismaService, requireTenant } from '@marketmind/kernel';
import { DASHBOARD_QUERY_PORT, DASHBOARD_CACHE } from '../dashboard.tokens';
import type { DashboardCache } from '../infrastructure/cache/dashboard-cache.port';
import { DashboardMetrics } from '../infrastructure/metrics/dashboard-metrics';
import { resolvePeriod, previousOf, type PeriodPreset } from './period.resolver';

export type OverviewCard = KpiValue & { availability: KpiAvailability };

export interface OverviewResult {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  kpis: OverviewCard[];
  /** Fração (0..1) das vendas do período com custo cadastrado. <1 = lucro parcial. */
  costCoveragePct: number;
}

/** TTLs por endpoint (s) — alinhados a docs/dashboard-api.md. */
const TTL = { overview: 60, kpis: 60, revenue: 120, orders: 120, products: 120, inventory: 120, categories: 300, abc: 300, topProducts: 120, alerts: 120, timeline: 300, health: 15 };

export interface PeriodInput {
  preset: PeriodPreset;
  from?: string;
  to?: string;
}

/**
 * Orquestra leitura analítica (porta) + cálculo puro (dashboard-core) + cache +
 * métricas. Nenhuma fórmula vive aqui — só composição. Tenant via RLS.
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_QUERY_PORT) private readonly query: DashboardQueryPort,
    @Inject(DASHBOARD_CACHE) private readonly cache: DashboardCache,
    private readonly prisma: PrismaService,
    private readonly metrics: DashboardMetrics,
  ) {}

  private async cached<T>(endpoint: string, ttl: number, params: unknown, loader: () => Promise<T>): Promise<T> {
    const companyId = requireTenant().companyId;
    const key = `dash:${companyId}:${endpoint}:${JSON.stringify(params)}`;
    const hit = await this.cache.get<T>(key);
    if (hit !== null) {
      this.metrics.recordCache(endpoint, true);
      this.metrics.requestsTotal.inc({ endpoint, status: 'hit' });
      return hit;
    }
    this.metrics.recordCache(endpoint, false);
    const t0 = Date.now();
    const value = await this.prisma.runInTransaction(loader);
    this.metrics.queryDuration.observe({ endpoint }, Date.now() - t0);
    this.metrics.requestsTotal.inc({ endpoint, status: 'miss' });
    await this.cache.set(key, value, ttl);
    return value;
  }

  private card(
    key: KpiKey,
    value: number,
    trend?: KpiValue['trend'],
    availabilityOverride?: KpiAvailability,
  ): OverviewCard {
    const d = KPI_CATALOG[key];
    return { key, label: d.label, unit: d.unit, value, availability: availabilityOverride ?? d.availability, trend };
  }

  async overview(now?: Date): Promise<OverviewResult> {
    const today = resolvePeriod('today', { now });
    const prevDay = previousOf(today);
    const mtd = resolvePeriod('mtd', { now });
    const prevMonth = previousOf(mtd);

    return this.cached('overview', TTL.overview, { d: today.from }, async () => {
      const [rToday, rPrevDay, rMonth, rPrevMonth, inv, cogs] = await Promise.all([
        this.query.getRevenue(today),
        this.query.getRevenue(prevDay),
        this.query.getRevenue(mtd),
        this.query.getRevenue(prevMonth),
        this.query.getInventorySummary(DEFAULT_ALERT_RULES.lowStockThreshold),
        this.query.getCogs(mtd),
      ]);

      const ticket = averageTicket(rMonth.revenue, rMonth.orders);
      const ticketPrev = averageTicket(rPrevMonth.revenue, rPrevMonth.orders);
      const hasCost = cogs.coveragePct > 0;

      const kpis: OverviewCard[] = [
        this.card('revenue.today', rToday.revenue, computeTrend(rToday.revenue, rPrevDay.revenue)),
        this.card('revenue.month', rMonth.revenue, computeTrend(rMonth.revenue, rPrevMonth.revenue)),
        this.card('orders.today', rToday.orders, computeTrend(rToday.orders, rPrevDay.orders)),
        this.card('orders.month', rMonth.orders, computeTrend(rMonth.orders, rPrevMonth.orders)),
        this.card('orders.averageTicket', ticket, computeTrend(ticket, ticketPrev)),
        this.card('margin.contribution', contributionMarginPct(rMonth.revenue, rMonth.commission, rMonth.freight)),
        // Lucro bruto sobre a parcela COBERTA (Fase 1). Disponível quando há custo.
        this.card('profit.gross', hasCost ? grossProfit(cogs.coveredRevenue, cogs.cogs) : 0, undefined, this.availability(hasCost)),
        this.card('profit.net', 0), // needs-table (Fase 2: despesas + impostos)
        this.card('products.active', inv.activeProducts),
        this.card('products.withoutStock', inv.productsWithoutStock),
        this.card('inventory.criticalStock', inv.criticalStock),
        this.card('growth.rate', growthRate(rMonth.revenue, rPrevMonth.revenue), computeTrend(rMonth.revenue, rPrevMonth.revenue)),
      ];

      return {
        generatedAt: new Date().toISOString(),
        periodFrom: mtd.from.toISOString(),
        periodTo: mtd.to.toISOString(),
        kpis,
        costCoveragePct: cogs.coveragePct,
      };
    });
  }

  /** profit/margin bruto fica 'available' assim que há custo; senão 'needs-table'. */
  private availability(hasCost: boolean): KpiAvailability {
    return hasCost ? 'available' : 'needs-table';
  }

  async kpis(period: PeriodInput): Promise<OverviewResult> {
    // Lista plana de KPIs do período selecionado (catálogo completo).
    const range = resolvePeriod(period.preset, period);
    return this.cached('kpis', TTL.kpis, period, async () => {
      const [rev, inv, cogs] = await Promise.all([
        this.query.getRevenue(range),
        this.query.getInventorySummary(DEFAULT_ALERT_RULES.lowStockThreshold),
        this.query.getCogs(range),
      ]);
      const prev = await this.query.getRevenue(previousOf(range));
      const days = Math.max(rangeDays(range), 1);
      const hasCost = cogs.coveragePct > 0;
      const hasStockCost = inv.valueAtCostCoveragePct > 0;
      const kpis: OverviewCard[] = [
        this.card('revenue.month', rev.revenue, computeTrend(rev.revenue, prev.revenue)),
        this.card('orders.month', rev.orders, computeTrend(rev.orders, prev.orders)),
        this.card('orders.averageTicket', averageTicket(rev.revenue, rev.orders)),
        this.card('sales.velocity', salesVelocity(rev.unitsSold, days)),
        this.card('margin.contribution', contributionMarginPct(rev.revenue, rev.commission, rev.freight)),
        this.card('margin.gross', hasCost ? grossMarginPct(cogs.coveredRevenue, cogs.cogs) : 0, undefined, this.availability(hasCost)),
        this.card('products.active', inv.activeProducts),
        this.card('products.withoutStock', inv.productsWithoutStock),
        this.card('inventory.criticalStock', inv.criticalStock),
        this.card('inventory.valueAtPrice', inv.valueAtPrice),
        this.card('inventory.valueAtCost', inv.valueAtCost, undefined, this.availability(hasStockCost)),
        this.card('growth.rate', growthRate(rev.revenue, prev.revenue)),
      ];
      return { generatedAt: new Date().toISOString(), periodFrom: range.from.toISOString(), periodTo: range.to.toISOString(), kpis, costCoveragePct: cogs.coveragePct };
    });
  }

  /** Monta o RevenueDTO incluindo lucro/margem bruta (Fase 1). */
  private revenueDto(cur: RevenueAggregate, cogs: CogsResult, growthPct: number): RevenueDTO {
    return {
      revenue: cur.revenue,
      orders: cur.orders,
      averageTicket: averageTicket(cur.revenue, cur.orders),
      contributionMarginPct: contributionMarginPct(cur.revenue, cur.commission, cur.freight),
      growthPct,
      grossProfit: grossProfit(cogs.coveredRevenue, cogs.cogs),
      grossMarginPct: grossMarginPct(cogs.coveredRevenue, cogs.cogs),
      costCoveragePct: cogs.coveragePct,
    };
  }

  async revenue(period: PeriodInput): Promise<RevenueDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('revenue', TTL.revenue, period, async () => {
      const [cur, prev, cogs] = await Promise.all([
        this.query.getRevenue(range),
        this.query.getRevenue(previousOf(range)),
        this.query.getCogs(range),
      ]);
      return this.revenueDto(cur, cogs, growthRate(cur.revenue, prev.revenue));
    });
  }

  async orders(period: PeriodInput): Promise<RevenueDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('orders', TTL.orders, period, async () => {
      const [cur, prev, cogs] = await Promise.all([
        this.query.getRevenue(range),
        this.query.getRevenue(previousOf(range)),
        this.query.getCogs(range),
      ]);
      return this.revenueDto(cur, cogs, growthRate(cur.orders, prev.orders));
    });
  }

  async timeline(period: PeriodInput): Promise<TimelinePointDTO[]> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('timeline', TTL.timeline, period, () => this.query.getTimeline(range));
  }

  async categories(period: PeriodInput): Promise<CategoryDTO[]> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('categories', TTL.categories, period, async () => {
      const rows = await this.query.getCategoryBreakdown(range);
      const total = rows.reduce((s, r) => s + r.revenue, 0);
      return rows.map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        revenue: r.revenue,
        sharePct: total > 0 ? r.revenue / total : 0,
      }));
    });
  }

  async abc(period: PeriodInput): Promise<AbcDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('abc', TTL.abc, period, async () => {
      const rows = await this.query.getProductRevenue(range);
      const entries = classifyAbc(rows.map((r) => ({ key: r.productId, revenue: r.revenue })));
      const counts = entries.reduce(
        (acc, e) => ({ ...acc, [e.abcClass]: acc[e.abcClass] + 1 }),
        { A: 0, B: 0, C: 0 },
      );
      return { entries, counts };
    });
  }

  async topProducts(period: PeriodInput, limit: number): Promise<TopProductDTO[]> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('topProducts', TTL.topProducts, { period, limit }, async () => {
      const [rows, total] = await Promise.all([this.query.getTopProducts(range, limit), this.query.getRevenue(range)]);
      return rows.map((r) => ({
        productId: r.productId,
        sku: r.sku,
        title: r.title,
        revenue: r.revenue,
        unitsSold: r.unitsSold,
        sharePct: total.revenue > 0 ? r.revenue / total.revenue : 0,
      }));
    });
  }

  async inventory(period: PeriodInput): Promise<InventoryDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('inventory', TTL.inventory, period, async () => {
      const [inv, rev] = await Promise.all([
        this.query.getInventorySummary(DEFAULT_ALERT_RULES.lowStockThreshold),
        this.query.getRevenue(range),
      ]);
      const days = Math.max(rangeDays(range), 1);
      const hasStockCost = inv.valueAtCostCoveragePct > 0;
      return {
        activeProducts: inv.activeProducts,
        productsWithoutStock: inv.productsWithoutStock,
        valueAtPrice: inv.valueAtPrice,
        // null quando nenhum SKU em estoque tem custo (UI mostra bloqueado).
        valueAtCost: hasStockCost ? inv.valueAtCost : null,
        valueAtCostCoveragePct: inv.valueAtCostCoveragePct,
        turnover: inventoryTurnover(rev.unitsSold, inv.averageInventoryUnits),
        coverageDays: stockCoverageDays(inv.totalUnitsOnHand, rev.unitsSold / days),
      };
    });
  }

  async products(period: PeriodInput, filter: ProductListFilter, page: PageRequest): Promise<ProductsPageDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('products', TTL.products, { period, filter, page }, async () => {
      const result = await this.query.listProducts(filter, page, range);
      return {
        items: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.max(Math.ceil(result.total / result.pageSize), 1),
      };
    });
  }

  async alerts(period: PeriodInput): Promise<AlertsDTO> {
    const range = resolvePeriod(period.preset, period);
    return this.cached('alerts', TTL.alerts, period, async () => {
      const signals = await this.query.getProductSignals(range, previousOf(range));
      const alerts = detectAlerts(signals);
      const counts = alerts.reduce(
        (acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }),
        { critical: 0, warning: 0, info: 0 },
      );
      return { generatedAt: new Date().toISOString(), alerts, counts };
    });
  }

  async health(): Promise<DashboardHealthDTO> {
    // Sem materialized views ainda (3.2): frescor = tempo real do operacional.
    return { status: 'ok', lastRefreshAt: new Date().toISOString(), cacheHit: false };
  }
}
