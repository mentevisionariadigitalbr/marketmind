/** Porta de persistência de despesas operacionais (Fase 2). */

export type ExpenseKind = 'FIXED' | 'VARIABLE';
export type ExpenseRecurrence = 'NONE' | 'MONTHLY' | 'YEARLY';

export interface ExpenseInput {
  readonly category: string;
  readonly kind: ExpenseKind;
  readonly amount: number;
  readonly recurrence: ExpenseRecurrence;
  readonly startsOn: Date;
  readonly endsOn?: Date | null;
  readonly note?: string | null;
}

export interface ExpenseRow {
  readonly id: string;
  readonly category: string;
  readonly kind: ExpenseKind;
  readonly amount: number;
  readonly currency: string;
  readonly recurrence: ExpenseRecurrence;
  readonly startsOn: string; // ISO
  readonly endsOn: string | null;
  readonly note: string | null;
}

export interface ExpensesPage {
  readonly items: readonly ExpenseRow[];
  readonly total: number;
}

export interface ExpenseRepository {
  create(input: ExpenseInput): Promise<ExpenseRow>;
  list(page: number, pageSize: number, filter: { category?: string }): Promise<ExpensesPage>;
  delete(id: string): Promise<boolean>;
}
