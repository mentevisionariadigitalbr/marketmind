/**
 * Classificação ABC (curva de Pareto) por receita. Pura e determinística.
 * Default 80/15/5: A até 80% acumulado, B até 95%, C o restante.
 */

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcInput {
  readonly key: string;
  readonly revenue: number;
}

export interface AbcEntry {
  readonly key: string;
  readonly revenue: number;
  readonly sharePct: number;
  readonly cumulativePct: number;
  readonly abcClass: AbcClass;
}

export interface AbcThresholds {
  /** Limite acumulado da classe A (default 0.8). */
  readonly a: number;
  /** Limite acumulado da classe B (default 0.95). */
  readonly b: number;
}

const DEFAULT_THRESHOLDS: AbcThresholds = { a: 0.8, b: 0.95 };

/** Tolerância p/ erro de ponto flutuante na soma acumulada (ex.: 0.8+0.15). */
const EPSILON = 1e-9;

/**
 * Ordena por receita desc, acumula participação e atribui A/B/C.
 * Entradas com receita <= 0 são ignoradas. Não muta o array recebido.
 */
export function classifyAbc(items: readonly AbcInput[], thresholds: AbcThresholds = DEFAULT_THRESHOLDS): AbcEntry[] {
  const positives = items.filter((i) => Number.isFinite(i.revenue) && i.revenue > 0);
  const total = positives.reduce((sum, i) => sum + i.revenue, 0);
  if (total === 0) return [];

  const sorted = [...positives].sort((a, b) => b.revenue - a.revenue);

  let cumulative = 0;
  return sorted.map((item) => {
    const sharePct = item.revenue / total;
    cumulative += sharePct;
    let abcClass: AbcClass = 'C';
    if (cumulative <= thresholds.a + EPSILON) abcClass = 'A';
    else if (cumulative <= thresholds.b + EPSILON) abcClass = 'B';
    return {
      key: item.key,
      revenue: item.revenue,
      sharePct,
      cumulativePct: cumulative,
      abcClass,
    };
  });
}
