/**
 * Previsão de reposição (Fase 1, Inc.3) — domínio puro, sem I/O.
 *
 * Consumo médio diário (CMD) ponderado pela recência, dias até a ruptura, estoque
 * ideal por horizonte (incluindo o lead time do fornecedor + estoque de segurança)
 * e a necessidade de compra. Classifica o risco de ruptura.
 */

export type ReorderRisk = 'critico' | 'atencao' | 'saudavel';

export interface ReorderInput {
  /** Estoque disponível agora. */
  available: number;
  /** Unidades vendidas nos últimos 30 / 60 / 90 dias. */
  units30: number;
  units60: number;
  units90: number;
  /** Lead time do fornecedor (dias) — usa o default quando não cadastrado. */
  leadTimeDays: number;
  /** Estoque de segurança como fração do consumo (default 20%). */
  safetyStockPct?: number;
}

export interface HorizonNeed {
  horizonDays: number;
  /** Estoque ideal para cobrir o horizonte + lead time + segurança. */
  idealStock: number;
  /** Quanto comprar agora: max(0, ideal − disponível). */
  purchaseNeed: number;
}

export interface ReorderForecast {
  /** Consumo médio diário ponderado. */
  cmd: number;
  /** Dias até zerar o estoque (null quando não há consumo). */
  daysRemaining: number | null;
  risk: ReorderRisk;
  horizons: HorizonNeed[];
}

export const REORDER_HORIZONS = [30, 60, 90, 120] as const;
const DEFAULT_SAFETY = 0.2;

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * CMD ponderado: a janela mais recente pesa mais (30d=0.5, 60d=0.3, 90d=0.2).
 * Em vendas estáveis (r/dia em todas as janelas) o resultado é exatamente r.
 */
export function weightedDailyConsumption(units30: number, units60: number, units90: number): number {
  const cmd = 0.5 * (units30 / 30) + 0.3 * (units60 / 60) + 0.2 * (units90 / 90);
  return round(Math.max(cmd, 0), 4);
}

function classifyRisk(daysRemaining: number | null, leadTimeDays: number): ReorderRisk {
  if (daysRemaining === null) return 'saudavel'; // sem consumo → sem risco de ruptura
  if (daysRemaining < leadTimeDays) return 'critico'; // rompe antes da reposição chegar
  if (daysRemaining < leadTimeDays + 15) return 'atencao';
  return 'saudavel';
}

export function forecastReorder(input: ReorderInput): ReorderForecast {
  const safety = input.safetyStockPct ?? DEFAULT_SAFETY;
  const leadTime = Math.max(input.leadTimeDays, 0);
  const cmd = weightedDailyConsumption(input.units30, input.units60, input.units90);
  const daysRemaining = cmd > 0 ? round(input.available / cmd, 1) : null;

  const horizons: HorizonNeed[] = REORDER_HORIZONS.map((horizonDays) => {
    const idealStock = Math.ceil(cmd * (horizonDays + leadTime) * (1 + safety));
    const purchaseNeed = Math.max(0, idealStock - input.available);
    return { horizonDays, idealStock, purchaseNeed };
  });

  return { cmd, daysRemaining, risk: classifyRisk(daysRemaining, leadTime), horizons };
}

/** Necessidade de compra para um horizonte específico (atalho). */
export function purchaseNeedFor(forecast: ReorderForecast, horizonDays: number): number {
  return forecast.horizons.find((h) => h.horizonDays === horizonDays)?.purchaseNeed ?? 0;
}
