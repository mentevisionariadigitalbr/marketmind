const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const formatBRL = (n: number) => brl.format(n ?? 0);
export const formatInt = (n: number) => int.format(n ?? 0);
export const formatPercent = (frac: number) => `${dec.format((frac ?? 0) * 100)}%`;
export const formatRatio = (n: number) => `${dec.format(n ?? 0)}x`;
export const formatDays = (n: number) => `${dec.format(n ?? 0)} d`;

export type Unit = 'BRL' | 'count' | 'percent' | 'ratio' | 'days';

export function formatUnit(value: number, unit: Unit): string {
  switch (unit) {
    case 'BRL':
      return formatBRL(value);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'days':
      return formatDays(value);
    default:
      return formatInt(value);
  }
}
