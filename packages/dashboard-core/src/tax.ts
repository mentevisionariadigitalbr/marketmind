/**
 * Motor de impostos (Fase 2) — alíquota EFETIVA configurável por regime, com
 * override por categoria. Puro e testável. A "verdade fiscal" detalhada (faixas
 * do Simples, anexos, partição de tributos) é responsabilidade do contador, que
 * informa a alíquota efetiva via TaxRule; aqui ficam só defaults de partida.
 */

export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

export interface TaxRule {
  /** null = alíquota padrão do regime; preenchido = override por categoria. */
  readonly category: string | null;
  /** Alíquota efetiva (fração 0..1, ex.: 0.06 = 6%). */
  readonly rate: number;
}

export interface CategoryRevenue {
  readonly category: string | null;
  readonly revenue: number;
}

export interface TaxResult {
  readonly tax: number;
  /** Alíquota efetiva média do período (fração 0..1). */
  readonly effectiveRatePct: number;
}

/**
 * Defaults de PARTIDA por regime (fração da receita). Configuráveis por TaxRule —
 * NÃO são verdade fiscal absoluta. Simples e Lucro Presumido implementados; Lucro
 * Real e MEI partem de 0 (configurar; no MEI, o DAS fixo entra como despesa).
 */
export const DEFAULT_REGIME_RATE: Readonly<Record<TaxRegime, number>> = {
  SIMPLES_NACIONAL: 0.06,
  LUCRO_PRESUMIDO: 0.1133,
  LUCRO_REAL: 0,
  MEI: 0,
};

/** Resolve a alíquota: regra por categoria → regra padrão do regime → default. */
export function effectiveRate(regime: TaxRegime, category: string | null, rules: readonly TaxRule[]): number {
  if (category !== null) {
    const byCategory = rules.find((r) => r.category !== null && r.category === category);
    if (byCategory) return byCategory.rate;
  }
  const regimeDefault = rules.find((r) => r.category === null);
  if (regimeDefault) return regimeDefault.rate;
  return DEFAULT_REGIME_RATE[regime];
}

/** Imposto do período = Σ (receita da categoria × alíquota resolvida). */
export function computeTax(
  revenueByCategory: readonly CategoryRevenue[],
  regime: TaxRegime,
  rules: readonly TaxRule[],
): TaxResult {
  let tax = 0;
  let total = 0;
  for (const { category, revenue } of revenueByCategory) {
    total += revenue;
    tax += revenue * effectiveRate(regime, category, rules);
  }
  return { tax, effectiveRatePct: total > 0 ? tax / total : 0 };
}
