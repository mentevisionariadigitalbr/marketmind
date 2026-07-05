/**
 * DTOs de resposta do dashboard — shapes estáveis compartilhados entre a API
 * (Swagger) e a UI. Tipos puros; serializáveis (datas como ISO string).
 */

import type { KpiValue } from './kpi';
import type { AbcEntry } from './abc';
import type { Alert } from './alerts';

export interface OverviewDTO {
  readonly generatedAt: string; // ISO
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly kpis: readonly KpiValue[];
}

export interface RevenueDTO {
  readonly revenue: number;
  readonly orders: number;
  readonly averageTicket: number;
  readonly contributionMarginPct: number;
  readonly growthPct: number;
  /** Lucro bruto (receita coberta − COGS) — Fase 1. */
  readonly grossProfit: number;
  readonly grossMarginPct: number;
  /** Fração (0..1) das vendas com custo cadastrado. <1 = lucro parcial. */
  readonly costCoveragePct: number;
}

export interface TimelinePointDTO {
  readonly bucket: string;
  readonly revenue: number;
  readonly orders: number;
  readonly unitsSold: number;
}

export interface TopProductDTO {
  readonly productId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly revenue: number;
  readonly unitsSold: number;
  readonly sharePct: number;
}

export interface CategoryDTO {
  readonly categoryId: string;
  readonly name: string;
  readonly revenue: number;
  readonly sharePct: number;
}

export interface InventoryDTO {
  readonly activeProducts: number;
  readonly productsWithoutStock: number;
  readonly valueAtPrice: number;
  /** null quando nenhum SKU em estoque tem custo (cobertura 0). */
  readonly valueAtCost: number | null;
  /** Fração (0..1) do valor de estoque (a preço) cujos SKUs têm custo. */
  readonly valueAtCostCoveragePct: number;
  readonly turnover: number;
  readonly coverageDays: number;
}

export interface AbcDTO {
  readonly entries: readonly AbcEntry[];
  readonly counts: { readonly A: number; readonly B: number; readonly C: number };
}

export interface CustomerInsightsDTO {
  readonly ltv: number;
  readonly aov: number;
  readonly frequency: number;
}

export interface DashboardHealthDTO {
  readonly status: 'ok' | 'degraded' | 'stale';
  readonly lastRefreshAt: string | null;
  readonly cacheHit: boolean;
}

export interface AlertsDTO {
  readonly generatedAt: string;
  readonly alerts: readonly Alert[];
  readonly counts: { readonly critical: number; readonly warning: number; readonly info: number };
}

export interface ProductRowDTO {
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
  readonly profit: number | null;
  readonly marginPct: number | null;
}

export interface ProductsPageDTO {
  readonly items: readonly ProductRowDTO[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
