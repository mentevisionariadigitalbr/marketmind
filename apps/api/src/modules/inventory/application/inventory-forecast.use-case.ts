import { Inject, Injectable } from '@nestjs/common';
import { forecastReorder, REORDER_HORIZONS, type ReorderRisk } from '@marketmind/dashboard-core';
import { FORECAST_REPOSITORY, ForecastRepository } from '../domain/ports/forecast.repository';

/** Lead time padrão (dias) quando o produto não tem fornecedor com prazo cadastrado. */
const DEFAULT_LEAD_TIME = 15;
const RISK_ORDER: Record<ReorderRisk, number> = { critico: 0, atencao: 1, saudavel: 2 };

export interface ForecastQuery {
  horizon?: number;
  supplierId?: string;
  risk?: ReorderRisk;
  onlyNeeded?: boolean;
}

export interface InventoryForecastRow {
  productId: string;
  sku: string | null;
  title: string;
  categoryId: string | null;
  available: number;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number;
  cmd: number;
  daysRemaining: number | null;
  ruptureDate: string | null;
  risk: ReorderRisk;
  idealStock: number;
  purchaseNeed: number;
  lastSale: string | null;
}

@Injectable()
export class GetInventoryForecastUseCase {
  constructor(@Inject(FORECAST_REPOSITORY) private readonly repo: ForecastRepository) {}

  async execute(query: ForecastQuery = {}): Promise<InventoryForecastRow[]> {
    const horizon = (REORDER_HORIZONS as readonly number[]).includes(query.horizon ?? 0) ? (query.horizon as number) : 90;
    const rows = await this.repo.fetchRows();
    const now = Date.now();

    let result: InventoryForecastRow[] = rows.map((r) => {
      const leadTimeDays = r.leadTimeDays ?? DEFAULT_LEAD_TIME;
      const f = forecastReorder({
        available: r.available,
        units30: r.units30,
        units60: r.units60,
        units90: r.units90,
        leadTimeDays,
      });
      const h = f.horizons.find((x) => x.horizonDays === horizon) ?? f.horizons[f.horizons.length - 1];
      const ruptureDate = f.daysRemaining !== null ? new Date(now + f.daysRemaining * 86_400_000).toISOString() : null;
      return {
        productId: r.productId,
        sku: r.sku,
        title: r.title,
        categoryId: r.categoryId,
        available: r.available,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        leadTimeDays,
        cmd: f.cmd,
        daysRemaining: f.daysRemaining,
        ruptureDate,
        risk: f.risk,
        idealStock: h.idealStock,
        purchaseNeed: h.purchaseNeed,
        lastSale: r.lastSale,
      };
    });

    if (query.supplierId) result = result.filter((r) => r.supplierId === query.supplierId);
    if (query.risk) result = result.filter((r) => r.risk === query.risk);
    if (query.onlyNeeded) result = result.filter((r) => r.purchaseNeed > 0);

    result.sort((a, b) => {
      const byRisk = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      if (byRisk !== 0) return byRisk;
      return (a.daysRemaining ?? Number.POSITIVE_INFINITY) - (b.daysRemaining ?? Number.POSITIVE_INFINITY);
    });
    return result;
  }
}
