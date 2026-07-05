/**
 * Vocabulário temporal do domínio analítico. Puro — sem libs de data.
 */

/** Janela [from, to). `from` inclusivo, `to` exclusivo. */
export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

/** Duração da janela em dias (>= 0). Usado por coverage/velocity. */
export function rangeDays(range: DateRange): number {
  const ms = range.to.getTime() - range.from.getTime();
  return ms <= 0 ? 0 : ms / 86_400_000;
}
