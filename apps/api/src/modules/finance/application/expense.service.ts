import { Inject, Injectable } from '@nestjs/common';
import { EXPENSE_REPOSITORY } from '../finance.tokens';
import {
  ExpenseRepository,
  ExpenseRow,
  ExpensesPage,
  ExpenseKind,
  ExpenseRecurrence,
} from '../domain/expense.repository';

export interface CreateExpenseCommand {
  readonly category: string;
  readonly kind: ExpenseKind;
  readonly amount: number;
  readonly recurrence: ExpenseRecurrence;
  readonly startsOn: string; // ISO
  readonly endsOn?: string;
  readonly note?: string;
}

/** Lançamentos de despesas operacionais (Fase 2). Lado de escrita do DRE. */
@Injectable()
export class ExpenseService {
  constructor(@Inject(EXPENSE_REPOSITORY) private readonly repo: ExpenseRepository) {}

  create(cmd: CreateExpenseCommand): Promise<ExpenseRow> {
    return this.repo.create({
      category: cmd.category,
      kind: cmd.kind,
      amount: cmd.amount,
      recurrence: cmd.recurrence,
      startsOn: new Date(cmd.startsOn),
      endsOn: cmd.endsOn ? new Date(cmd.endsOn) : null,
      note: cmd.note ?? null,
    });
  }

  list(page: number, pageSize: number, filter: { category?: string }): Promise<ExpensesPage> {
    return this.repo.list(page, pageSize, filter);
  }

  delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
