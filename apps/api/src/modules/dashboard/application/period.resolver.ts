import type { DateRange } from '@marketmind/dashboard-core';

export type PeriodPreset = '7d' | '15d' | '30d' | '90d' | '180d' | '365d' | 'today' | 'mtd' | 'ytd' | 'custom';

const PRESET_DAYS: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };

/**
 * Resolve presets/custom para um [from, to). `now` injetável (testes determinísticos).
 * `custom` exige `from`/`to`; demais presets ignoram-nos.
 */
export function resolvePeriod(
  preset: PeriodPreset,
  opts: { from?: string; to?: string; now?: Date } = {},
): DateRange {
  const now = opts.now ?? new Date();
  const to = endOfToday(now);

  if (preset === 'custom') {
    const from = opts.from ? new Date(opts.from) : startOfDay(addDays(now, -30));
    const customTo = opts.to ? new Date(opts.to) : to;
    if (Number.isNaN(from.getTime()) || Number.isNaN(customTo.getTime()) || from >= customTo) {
      throw new RangeError('Período custom inválido: "from" deve ser anterior a "to".');
    }
    return { from, to: customTo };
  }
  if (preset === 'today') return { from: startOfDay(now), to };
  if (preset === 'mtd') return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to };
  if (preset === 'ytd') return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to };

  const days = PRESET_DAYS[preset];
  if (!days) throw new RangeError(`Preset de período desconhecido: ${preset}`);
  return { from: startOfDay(addDays(now, -days)), to };
}

/** Janela anterior de mesma duração (comparativo período atual vs. anterior). */
export function previousOf(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime()) };
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function endOfToday(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
