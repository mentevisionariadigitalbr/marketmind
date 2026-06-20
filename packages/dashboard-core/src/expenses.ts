/**
 * Expansão pura de despesas recorrentes (Fase 2). Uma despesa MENSAL/ANUAL conta
 * uma vez por mês/ano ativo dentro do período do DRE; NONE é um lançamento único.
 * Sem I/O — a infra busca as linhas e soma com estas funções.
 */
import type { DateRange } from './period';

export type ExpenseRecurrence = 'NONE' | 'MONTHLY' | 'YEARLY';

export interface RecurringExpense {
  readonly amount: number;
  readonly recurrence: ExpenseRecurrence;
  readonly startsOn: Date;
  /** Fim da vigência (exclusivo); null = sem fim. */
  readonly endsOn: Date | null;
}

const monthIndex = (d: Date): number => d.getUTCFullYear() * 12 + d.getUTCMonth();

/** Nº de meses-calendário tocados por [from, to). */
function countMonths(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  const last = new Date(to.getTime() - 1);
  return monthIndex(last) - monthIndex(from) + 1;
}

/** Nº de anos-calendário tocados por [from, to). */
function countYears(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  const last = new Date(to.getTime() - 1);
  return last.getUTCFullYear() - from.getUTCFullYear() + 1;
}

/** Valor que UMA despesa contribui ao período [range.from, range.to). */
export function expenseAmountInRange(e: RecurringExpense, range: DateRange): number {
  if (e.recurrence === 'NONE') {
    const t = e.startsOn.getTime();
    return t >= range.from.getTime() && t < range.to.getTime() ? e.amount : 0;
  }
  const from = new Date(Math.max(e.startsOn.getTime(), range.from.getTime()));
  const toMs = e.endsOn ? Math.min(e.endsOn.getTime(), range.to.getTime()) : range.to.getTime();
  const to = new Date(toMs);
  const occurrences = e.recurrence === 'MONTHLY' ? countMonths(from, to) : countYears(from, to);
  return e.amount * occurrences;
}

/** Soma das despesas operacionais do período (recorrências expandidas). */
export function totalOperatingExpenses(expenses: readonly RecurringExpense[], range: DateRange): number {
  return expenses.reduce((sum, e) => sum + expenseAmountInRange(e, range), 0);
}
