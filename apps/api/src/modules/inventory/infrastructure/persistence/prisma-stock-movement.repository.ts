import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType as PrismaType } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  CreateMovementData,
  MovementRow,
  ProductRef,
  ReconciliationRow,
  StockMovementRepository,
  StockMovementType,
} from '../../domain/ports/stock-movement.repository';

type ReconRaw = {
  productId: string;
  balanceAfter: number;
  sku: string | null;
  title: string;
  mlAvailable: number | null;
};

/** Razão de estoque (RLS via runInTransaction + filtro de company). */
@Injectable()
export class PrismaStockMovementRepository implements StockMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async findProduct(productId: string): Promise<ProductRef | null> {
    return this.prisma.runInTransaction(async () => {
      const p = await this.prisma.db.product.findFirst({
        where: { id: productId, companyId: this.companyId },
        select: { id: true, sku: true, title: true, availableQuantity: true },
      });
      return p ? { id: p.id, sku: p.sku, title: p.title, mlAvailable: p.availableQuantity ?? 0 } : null;
    });
  }

  async currentLedgerBalance(productId: string): Promise<number | null> {
    return this.prisma.runInTransaction(async () => {
      const last = await this.prisma.db.stockMovement.findFirst({
        where: { productId, companyId: this.companyId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      return last?.balanceAfter ?? null;
    });
  }

  async create(data: CreateMovementData): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.stockMovement.create({
        data: {
          companyId: this.companyId,
          productId: data.productId,
          variantId: data.variantId ?? undefined,
          type: data.type as PrismaType,
          quantity: data.quantity,
          balanceAfter: data.balanceAfter,
          unitCost: data.unitCost !== null ? new Prisma.Decimal(data.unitCost) : undefined,
          reason: data.reason ?? undefined,
          referenceType: data.referenceType ?? undefined,
          referenceId: data.referenceId ?? undefined,
          createdBy: data.createdBy ?? undefined,
        },
      });
    });
  }

  async listByProduct(productId: string, limit: number): Promise<MovementRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.stockMovement.findMany({
        where: { productId, companyId: this.companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, type: true, quantity: true, balanceAfter: true, reason: true, referenceType: true, occurredAt: true },
      });
      return rows.map((r) => ({
        id: r.id,
        type: r.type as StockMovementType,
        quantity: r.quantity,
        balanceAfter: r.balanceAfter,
        reason: r.reason,
        referenceType: r.referenceType,
        occurredAt: r.occurredAt.toISOString(),
      }));
    });
  }

  async reconciliation(): Promise<ReconciliationRow[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      // Um registro por produto (último movimento) vs disponível do ML.
      const rows = await this.prisma.db.$queryRaw<ReconRaw[]>`
        SELECT DISTINCT ON (m.product_id)
          m.product_id        AS "productId",
          m.balance_after     AS "balanceAfter",
          p.sku               AS "sku",
          p.title             AS "title",
          p.available_quantity AS "mlAvailable"
        FROM stock_movements m
        JOIN products p ON p.id = m.product_id
        WHERE m.company_id = ${companyId}::uuid
        ORDER BY m.product_id, m.created_at DESC
      `;
      return rows.map((r) => {
        const mlAvailable = r.mlAvailable ?? 0;
        return {
          productId: r.productId,
          sku: r.sku,
          title: r.title,
          mlAvailable,
          ledgerBalance: r.balanceAfter,
          divergence: r.balanceAfter - mlAvailable,
        };
      });
    });
  }
}
