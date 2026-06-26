/**
 * Fluxo de caixa (Fase 3, Inc.1) — domínio puro. Monta uma linha do tempo semanal
 * de entradas (a receber) e saídas (a pagar) com saldo acumulado. Sem I/O.
 */

export interface CashEntry {
  /** Data ISO (entrada: data da venda; saída: liquidação/vencimento). */
  date: string;
  amount: number;
}

export interface CashflowBucket {
  /** Segunda-feira da semana (ISO yyyy-mm-dd). */
  weekStart: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Segunda-feira (UTC) da semana de uma data. */
export function mondayOf(reference: Date): Date {
  const dt = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = dt.getUTCDay(); // 0=Dom … 6=Sáb
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt;
}

/** Lista de segundas (ISO) de -weeksBack a +weeksForward em torno da referência. */
export function isoWeekStarts(reference: Date, weeksBack: number, weeksForward: number): string[] {
  const mon = mondayOf(reference);
  const out: string[] = [];
  for (let i = -weeksBack; i <= weeksForward; i++) {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Distribui entradas/saídas nas semanas (`weeks` = segundas ascendentes) e calcula
 * o saldo acumulado. Lançamentos antes da 1ª semana entram no saldo de abertura;
 * depois da última, caem na última semana.
 */
export function buildCashflowTimeline(
  inflows: readonly CashEntry[],
  outflows: readonly CashEntry[],
  weeks: readonly string[],
  openingBalance = 0,
): CashflowBucket[] {
  const starts = weeks.map((w) => new Date(`${w}T00:00:00Z`).getTime());
  const buckets: CashflowBucket[] = weeks.map((w) => ({ weekStart: w, inflow: 0, outflow: 0, net: 0, balance: 0 }));
  let opening = openingBalance;

  const assign = (entries: readonly CashEntry[], sign: 1 | -1, key: 'inflow' | 'outflow') => {
    for (const e of entries) {
      const t = new Date(e.date).getTime();
      if (starts.length === 0) continue;
      if (t < starts[0]) {
        opening += sign * e.amount;
        continue;
      }
      let idx = 0;
      for (let i = 0; i < starts.length; i++) {
        if (starts[i] <= t) idx = i;
        else break;
      }
      buckets[idx][key] += e.amount;
    }
  };

  assign(inflows, 1, 'inflow');
  assign(outflows, -1, 'outflow');

  let balance = opening;
  for (const b of buckets) {
    b.inflow = round2(b.inflow);
    b.outflow = round2(b.outflow);
    b.net = round2(b.inflow - b.outflow);
    balance += b.net;
    b.balance = round2(balance);
  }
  return buckets;
}
