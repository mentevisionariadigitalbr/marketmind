import { Inject, Injectable } from '@nestjs/common';
import { buildCashflowTimeline, isoWeekStarts, type CashflowBucket } from '@marketmind/dashboard-core';
import {
  CASHFLOW_REPOSITORY,
  CashflowRepository,
  PayableRow,
  ReceivableRow,
} from '../domain/ports/cashflow.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

const WEEKS_BACK = 4;
const WEEKS_FORWARD = 8;
const DAY = 86_400_000;

export interface CreatePayableInput {
  supplierId?: string | null;
  description?: string;
  amount?: number;
  dueDate?: string;
  createdBy: string | null;
}

export interface CashflowProjection {
  weeks: CashflowBucket[];
  totals: {
    inflow: number;
    outflow: number;
    net: number;
    endingBalance: number;
    overdueAmount: number;
  };
}

@Injectable()
export class CreatePayableUseCase {
  constructor(@Inject(CASHFLOW_REPOSITORY) private readonly repo: CashflowRepository) {}

  async execute(input: CreatePayableInput): Promise<{ id: string }> {
    if (!(typeof input.amount === 'number' && input.amount > 0)) {
      throw new ValidationError('Informe um valor maior que zero.');
    }
    if (!input.dueDate || Number.isNaN(Date.parse(input.dueDate))) {
      throw new ValidationError('Informe uma data de vencimento válida.');
    }
    if (input.supplierId && !(await this.repo.supplierExists(input.supplierId))) {
      throw new NotFoundError('Fornecedor');
    }
    const id = await this.repo.createPayable({
      supplierId: input.supplierId || null,
      description: input.description?.trim() || null,
      amount: input.amount,
      dueDate: new Date(input.dueDate),
      createdBy: input.createdBy,
    });
    return { id };
  }
}

@Injectable()
export class ListPayablesUseCase {
  constructor(@Inject(CASHFLOW_REPOSITORY) private readonly repo: CashflowRepository) {}
  execute(): Promise<PayableRow[]> {
    return this.repo.listPayables();
  }
}

@Injectable()
export class PayPayableUseCase {
  constructor(@Inject(CASHFLOW_REPOSITORY) private readonly repo: CashflowRepository) {}
  async execute(id: string): Promise<void> {
    const ok = await this.repo.markPaid(id);
    if (!ok) throw new NotFoundError('Conta a pagar pendente');
  }
}

@Injectable()
export class ListReceivablesUseCase {
  constructor(@Inject(CASHFLOW_REPOSITORY) private readonly repo: CashflowRepository) {}
  execute(limit = 50): Promise<ReceivableRow[]> {
    return this.repo.recentReceivables(Math.min(Math.max(limit, 1), 200));
  }
}

@Injectable()
export class GetCashflowProjectionUseCase {
  constructor(@Inject(CASHFLOW_REPOSITORY) private readonly repo: CashflowRepository) {}

  async execute(now = new Date()): Promise<CashflowProjection> {
    const weeks = isoWeekStarts(now, WEEKS_BACK, WEEKS_FORWARD);
    const from = new Date(`${weeks[0]}T00:00:00Z`);
    const to = new Date(new Date(`${weeks[weeks.length - 1]}T00:00:00Z`).getTime() + 7 * DAY);

    const [inflows, outflows] = await Promise.all([
      this.repo.receivableEntries(from, to),
      this.repo.payableEntries(from, to),
    ]);

    const buckets = buildCashflowTimeline(inflows, outflows, weeks);
    const inflow = round2(buckets.reduce((a, b) => a + b.inflow, 0));
    const outflow = round2(buckets.reduce((a, b) => a + b.outflow, 0));
    const overdueAmount = round2(
      outflows.filter((o) => new Date(o.date).getTime() < now.getTime()).reduce((a, o) => a + o.amount, 0),
    );

    return {
      weeks: buckets,
      totals: {
        inflow,
        outflow,
        net: round2(inflow - outflow),
        endingBalance: buckets.length ? buckets[buckets.length - 1].balance : 0,
        overdueAmount,
      },
    };
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
