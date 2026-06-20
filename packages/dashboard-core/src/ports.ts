/**
 * Porta de leitura analítica (Hexagonal). O domínio define O QUE precisa; a infra
 * (apps/api sobre MVs/fact tables) implementa COMO. Toda chamada é tenant-scoped
 * via RLS — `companyId` nunca trafega aqui (vem do TenantContext na borda).
 *
 * Sem Prisma, sem Nest: apenas tipos. Mantém o domínio testável e desacoplado.
 */

import type { DateRange } from './period';

export interface RevenueAggregate {
  readonly revenue: number;
  readonly orders: number;
  readonly unitsSold: number;
  readonly commission: number;
  readonly freight: number;
  readonly distinctCustomers: number;
}

export interface TimelinePoint {
  readonly bucket: string; // ISO date/period key (alinhado a dim_dates)
  readonly revenue: number;
  readonly orders: number;
  readonly unitsSold: number;
}

export interface ProductRevenueRow {
  readonly productId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly revenue: number;
  readonly unitsSold: number;
}

export interface CategoryRevenueRow {
  readonly categoryId: string;
  readonly name: string;
  readonly revenue: number;
  readonly unitsSold: number;
  readonly productCount: number;
}

export interface InventorySummary {
  readonly activeProducts: number;
  readonly productsWithoutStock: number;
  /** Ativos com estoque > 0 e <= lowStockThreshold. */
  readonly criticalStock: number;
  readonly totalUnitsOnHand: number;
  readonly valueAtPrice: number;
  /** Valor de estoque a custo (estoque × custo vigente hoje) dos SKUs COM custo. */
  readonly valueAtCost: number;
  /** Fração (0..1) do valor de estoque (a preço) cujos SKUs têm custo. */
  readonly valueAtCostCoveragePct: number;
  readonly averageInventoryUnits: number;
}

/**
 * COGS do período + cobertura. `coveredRevenue` é a receita (item-level) apenas
 * dos itens COM custo — lucro bruto = coveredRevenue − cogs (honesto: itens sem
 * custo não entram como custo zero). `coveragePct` = coveredRevenue / receita total.
 */
export interface CogsResult {
  readonly cogs: number;
  readonly coveredRevenue: number;
  readonly coveragePct: number;
}

/** Filtros da listagem paginada de produtos (módulo /dashboard/products). */
export interface ProductListFilter {
  readonly sku?: string;
  readonly title?: string;
  readonly categoryId?: string;
  readonly marketplaceAccountId?: string;
  readonly status?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minStock?: number;
  readonly maxStock?: number;
}

export interface PageRequest {
  readonly page: number; // 1-based
  readonly pageSize: number;
}

export interface Paged<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ProductListRow {
  readonly productId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly thumbnail: string | null;
  readonly categoryId: string | null;
  readonly status: string;
  readonly price: number;
  readonly stock: number;
  readonly revenue: number;
  readonly unitsSold: number;
  /** null até existir `product_costs` (lucro/margem dependem de COGS). */
  readonly profit: number | null;
  readonly marginPct: number | null;
}

/**
 * Sinais brutos por produto para detecção de alertas (`detectAlerts`).
 * Período atual vs. anterior para detectar queda/explosão de vendas.
 */
export interface ProductSignal {
  readonly productId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly stock: number;
  readonly status: string;
  readonly unitsSoldCurrent: number;
  readonly unitsSoldPrevious: number;
  /** null até existir `product_costs`. */
  readonly marginPct: number | null;
}

/**
 * Contrato consumido pelos casos de uso do dashboard. Cada método mapeia a
 * uma MV/consulta read-optimized. Implementação fica em apps/api (Sprint 3.1).
 */
export interface DashboardQueryPort {
  getRevenue(range: DateRange): Promise<RevenueAggregate>;
  getCogs(range: DateRange): Promise<CogsResult>;
  getTimeline(range: DateRange): Promise<TimelinePoint[]>;
  getTopProducts(range: DateRange, limit: number): Promise<ProductRevenueRow[]>;
  getTopCategories(range: DateRange, limit: number): Promise<CategoryRevenueRow[]>;
  getProductRevenue(range: DateRange): Promise<ProductRevenueRow[]>;
  getCategoryBreakdown(range: DateRange): Promise<CategoryRevenueRow[]>;
  listProducts(filter: ProductListFilter, page: PageRequest, range: DateRange): Promise<Paged<ProductListRow>>;
  getInventorySummary(lowStockThreshold?: number): Promise<InventorySummary>;
  getProductSignals(current: DateRange, previous: DateRange): Promise<ProductSignal[]>;
}
