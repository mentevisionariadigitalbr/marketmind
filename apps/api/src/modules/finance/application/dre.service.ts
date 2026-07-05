import { Inject, Injectable } from '@nestjs/common';
import { buildDre, type Dre, type DashboardQueryPort } from '@marketmind/dashboard-core';
import { DASHBOARD_QUERY_PORT } from '../../dashboard/dashboard.tokens';
import { resolvePeriod, type PeriodPreset } from '../../dashboard/application/period.resolver';

export interface DrePeriod {
  readonly preset: PeriodPreset;
  readonly from?: string;
  readonly to?: string;
}

export interface DreResult extends Dre {
  readonly periodFrom: string;
  readonly periodTo: string;
  /** Cobertura de custo (0..1): <1 = CMV/lucro parciais. */
  readonly costCoveragePct: number;
  readonly effectiveTaxRatePct: number;
}

/**
 * DRE consolidado (Fase 2). Consome a MESMA porta de leitura do Overview e a
 * MESMA função pura `buildDre` → o lucro líquido bate com o KPI `profit.net`.
 * Escrita (custos/despesas/impostos) fica nos demais serviços do finance.
 */
@Injectable()
export class DreService {
  constructor(@Inject(DASHBOARD_QUERY_PORT) private readonly query: DashboardQueryPort) {}

  async build(period: DrePeriod): Promise<DreResult> {
    const range = resolvePeriod(period.preset, period);
    const [rev, cogs, tax, opex] = await Promise.all([
      this.query.getRevenue(range),
      this.query.getCogs(range),
      this.query.getTaxes(range),
      this.query.getOperatingExpenses(range),
    ]);
    const dre = buildDre({
      grossRevenue: rev.revenue,
      commission: rev.commission,
      freight: rev.freight,
      taxes: tax.tax,
      cogs: cogs.cogs,
      operatingExpenses: opex,
    });
    return {
      ...dre,
      periodFrom: range.from.toISOString(),
      periodTo: range.to.toISOString(),
      costCoveragePct: cogs.coveragePct,
      effectiveTaxRatePct: tax.effectiveRatePct,
    };
  }
}
