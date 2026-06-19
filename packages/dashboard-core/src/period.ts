/**
 * Vocabulário temporal do domínio analítico. Puro — sem libs de data.
 * A app (infra) traduz Granularity/DateRange para SQL/`dim_dates`.
 */

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Janela [from, to). `from` inclusivo, `to` exclusivo. */
export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface Period {
  readonly granularity: Granularity;
  readonly range: DateRange;
}

/** Período imediatamente anterior, de mesma duração (para growth/MoM/YoY). */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime()),
  };
}

/** Duração da janela em dias (>= 0). Usado por coverage/velocity. */
export function rangeDays(range: DateRange): number {
  const ms = range.to.getTime() - range.from.getTime();
  return ms <= 0 ? 0 : ms / 86_400_000;
}
