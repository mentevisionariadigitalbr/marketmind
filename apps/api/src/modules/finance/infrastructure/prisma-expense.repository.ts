import { Injectable } from '@nestjs/common';
import { Prisma, ExpenseKind, ExpenseRecurrence } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  ExpenseInput,
  ExpenseRepository,
  ExpenseRow,
  ExpensesPage,
} from '../domain/expense.repository';

type DbExpense = {
  id: string; category: string; kind: ExpenseKind; amount: Prisma.Decimal; currency: string;
  recurrence: ExpenseRecurrence; startsOn: Date; endsOn: Date | null; note: string | null;
};

/** Persistência de despesas (RLS via runInTransaction + filtro de company). */
@Injectable()
export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  private toRow(e: DbExpense): ExpenseRow {
    return {
      id: e.id,
      category: e.category,
      kind: e.kind,
      amount: Number(e.amount),
      currency: e.currency,
      recurrence: e.recurrence,
      startsOn: e.startsOn.toISOString(),
      endsOn: e.endsOn ? e.endsOn.toISOString() : null,
      note: e.note,
    };
  }

  async create(input: ExpenseInput): Promise<ExpenseRow> {
    return this.prisma.runInTransaction(async () => {
      const created = await this.prisma.db.expense.create({
        data: {
          companyId: this.companyId,
          category: input.category,
          kind: input.kind as ExpenseKind,
          amount: new Prisma.Decimal(input.amount),
          recurrence: input.recurrence as ExpenseRecurrence,
          startsOn: input.startsOn,
          endsOn: input.endsOn ?? null,
          note: input.note ?? null,
        },
      });
      return this.toRow(created as DbExpense);
    });
  }

  async list(page: number, pageSize: number, filter: { category?: string }): Promise<ExpensesPage> {
    const size = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * size;
    return this.prisma.runInTransaction(async () => {
      const where = {
        companyId: this.companyId,
        ...(filter.category ? { category: { contains: filter.category, mode: 'insensitive' as const } } : {}),
      };
      const [rows, total] = await Promise.all([
        this.prisma.db.expense.findMany({ where, orderBy: { startsOn: 'desc' }, skip, take: size }),
        this.prisma.db.expense.count({ where }),
      ]);
      return { items: rows.map((r) => this.toRow(r as DbExpense)), total };
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const result = await this.prisma.db.expense.deleteMany({ where: { id, companyId: this.companyId } });
      return result.count > 0;
    });
  }
}
