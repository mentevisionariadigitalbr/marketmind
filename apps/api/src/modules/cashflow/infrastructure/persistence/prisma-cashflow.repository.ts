import { Injectable } from '@nestjs/common';
import { Prisma, PayableStatus as PrismaStatus } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  CashEntryRow,
  CashflowRepository,
  CreatePayableData,
  PayableRow,
  PayableStatus,
  ReceivableRow,
} from '../../domain/ports/cashflow.repository';

@Injectable()
export class PrismaCashflowRepository implements CashflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async createPayable(data: CreatePayableData): Promise<string> {
    return this.prisma.runInTransaction(async () => {
      const created = await this.prisma.db.payable.create({
        data: {
          companyId: this.companyId,
          supplierId: data.supplierId ?? undefined,
          sourceType: 'manual',
          description: data.description ?? undefined,
          amount: new Prisma.Decimal(data.amount),
          dueDate: data.dueDate,
          createdBy: data.createdBy ?? undefined,
        },
        select: { id: true },
      });
      return created.id;
    });
  }

  async listPayables(): Promise<PayableRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.payable.findMany({
        where: { companyId: this.companyId },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        include: { supplier: { select: { name: true } } },
      });
      return rows.map((p) => ({
        id: p.id,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name ?? null,
        description: p.description,
        amount: Number(p.amount),
        dueDate: p.dueDate.toISOString(),
        status: p.status as PayableStatus,
        paidAt: p.paidAt?.toISOString() ?? null,
        sourceType: p.sourceType,
      }));
    });
  }

  async markPaid(id: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const res = await this.prisma.db.payable.updateMany({
        where: { id, companyId: this.companyId, status: PrismaStatus.PENDING },
        data: { status: PrismaStatus.PAID, paidAt: new Date() },
      });
      return res.count > 0;
    });
  }

  async supplierExists(supplierId: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const s = await this.prisma.db.supplier.findFirst({ where: { id: supplierId, companyId: this.companyId }, select: { id: true } });
      return !!s;
    });
  }

  async payableEntries(from: Date, to: Date): Promise<CashEntryRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.$queryRaw<{ date: Date; amount: number }[]>`
        SELECT COALESCE(paid_at, due_date) AS "date", amount::float8 AS "amount"
        FROM payables
        WHERE company_id = ${this.companyId}::uuid
          AND COALESCE(paid_at, due_date) >= ${from} AND COALESCE(paid_at, due_date) < ${to}
      `;
      return rows.map((r) => ({ date: r.date.toISOString(), amount: r.amount }));
    });
  }

  async receivableEntries(from: Date, to: Date): Promise<CashEntryRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.$queryRaw<{ date: Date; amount: number }[]>`
        SELECT ordered_at AS "date", (gross_amount - commission_amount - freight_amount)::float8 AS "amount"
        FROM orders
        WHERE company_id = ${this.companyId}::uuid AND status = 'PAID'
          AND ordered_at >= ${from} AND ordered_at < ${to}
      `;
      return rows.map((r) => ({ date: r.date.toISOString(), amount: r.amount }));
    });
  }

  async recentReceivables(limit: number): Promise<ReceivableRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.$queryRaw<
        { orderId: string; externalId: string; date: Date; gross: number; commission: number; freight: number; net: number }[]
      >`
        SELECT id AS "orderId", external_id AS "externalId", ordered_at AS "date",
               gross_amount::float8 AS "gross", commission_amount::float8 AS "commission",
               freight_amount::float8 AS "freight",
               (gross_amount - commission_amount - freight_amount)::float8 AS "net"
        FROM orders
        WHERE company_id = ${this.companyId}::uuid AND status = 'PAID'
        ORDER BY ordered_at DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ ...r, date: r.date.toISOString() }));
    });
  }
}
