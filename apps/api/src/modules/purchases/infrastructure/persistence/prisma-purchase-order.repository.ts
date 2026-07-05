import { Injectable } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus as PrismaStatus } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { weightedAverageCost } from '@marketmind/dashboard-core';
import {
  CreatePurchaseOrderData,
  PurchaseOrderListItem,
  PurchaseOrderRepository,
  PurchaseOrderStatus,
  PurchaseOrderView,
} from '../../domain/ports/purchase-order.repository';

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async supplierExists(supplierId: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const s = await this.prisma.db.supplier.findFirst({ where: { id: supplierId, companyId: this.companyId }, select: { id: true } });
      return !!s;
    });
  }

  async productsExist(productIds: string[]): Promise<boolean> {
    const ids = [...new Set(productIds)];
    if (ids.length === 0) return false;
    return this.prisma.runInTransaction(async () => {
      const count = await this.prisma.db.product.count({ where: { id: { in: ids }, companyId: this.companyId } });
      return count === ids.length;
    });
  }

  async create(data: CreatePurchaseOrderData): Promise<string> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      const po = await this.prisma.db.purchaseOrder.create({
        data: {
          companyId,
          supplierId: data.supplierId,
          notes: data.notes ?? undefined,
          expectedAt: data.expectedAt ?? undefined,
          createdBy: data.createdBy ?? undefined,
          items: {
            create: data.items.map((i) => ({
              companyId,
              productId: i.productId,
              quantity: i.quantity,
              unitCost: new Prisma.Decimal(i.unitCost),
            })),
          },
        },
        select: { id: true },
      });
      return po.id;
    });
  }

  async list(): Promise<PurchaseOrderListItem[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.purchaseOrder.findMany({
        where: { companyId: this.companyId },
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { name: true } }, items: { select: { quantity: true, unitCost: true } } },
      });
      return rows.map((po) => ({
        id: po.id,
        supplierName: po.supplier?.name ?? null,
        status: po.status as PurchaseOrderStatus,
        itemsCount: po.items.length,
        total: po.items.reduce((acc, i) => acc + i.quantity * Number(i.unitCost), 0),
        expectedAt: po.expectedAt?.toISOString() ?? null,
        receivedAt: po.receivedAt?.toISOString() ?? null,
        createdAt: po.createdAt.toISOString(),
      }));
    });
  }

  async findById(id: string): Promise<PurchaseOrderView | null> {
    return this.prisma.runInTransaction(async () => {
      const po = await this.prisma.db.purchaseOrder.findFirst({
        where: { id, companyId: this.companyId },
        include: {
          supplier: { select: { name: true } },
          items: { include: { product: { select: { title: true, sku: true } } }, orderBy: { createdAt: 'asc' } },
        },
      });
      if (!po) return null;
      return {
        id: po.id,
        supplierId: po.supplierId,
        supplierName: po.supplier?.name ?? null,
        status: po.status as PurchaseOrderStatus,
        notes: po.notes,
        expectedAt: po.expectedAt?.toISOString() ?? null,
        receivedAt: po.receivedAt?.toISOString() ?? null,
        createdAt: po.createdAt.toISOString(),
        total: po.items.reduce((acc, i) => acc + i.quantity * Number(i.unitCost), 0),
        items: po.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productTitle: i.product.title,
          sku: i.product.sku,
          quantity: i.quantity,
          unitCost: Number(i.unitCost),
          receivedQuantity: i.receivedQuantity,
        })),
      };
    });
  }

  async receive(id: string, userId: string | null): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      const db = this.prisma.db;
      const po = await db.purchaseOrder.findFirst({ where: { id, companyId }, include: { items: true } });
      if (!po || po.status === 'RECEIVED' || po.status === 'CANCELLED') return;

      const now = new Date();
      for (const item of po.items) {
        // Saldo atual do razão (abre pelo disponível do ML quando ainda não há movimentos).
        const lastMov = await db.stockMovement.findFirst({
          where: { productId: item.productId, companyId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        let currentBalance: number;
        if (lastMov) {
          currentBalance = lastMov.balanceAfter;
        } else {
          const prod = await db.product.findFirst({ where: { id: item.productId, companyId }, select: { availableQuantity: true } });
          currentBalance = prod?.availableQuantity ?? 0;
        }

        // Custo atual (nível produto) → média ponderada do custo de aquisição.
        const lastCost = await db.productCost.findFirst({
          where: { productId: item.productId, companyId, variantId: null },
          orderBy: { validFrom: 'desc' },
        });
        const currentAcq = lastCost ? Number(lastCost.acquisitionCost) : 0;
        const incomingCost = Number(item.unitCost);
        const newAcq = weightedAverageCost(currentBalance, currentAcq, item.quantity, incomingCost);

        await db.productCost.create({
          data: {
            companyId,
            productId: item.productId,
            variantId: null,
            acquisitionCost: new Prisma.Decimal(newAcq),
            inboundFreight: lastCost ? lastCost.inboundFreight : new Prisma.Decimal(0),
            packagingCost: lastCost ? lastCost.packagingCost : new Prisma.Decimal(0),
            otherCost: lastCost ? lastCost.otherCost : new Prisma.Decimal(0),
            validFrom: now,
            note: `Recebimento de compra ${id}`,
          },
        });

        // ENTRADA no razão de estoque (rastreabilidade; ML segue mestre do disponível).
        await db.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            type: 'ENTRADA',
            quantity: item.quantity,
            balanceAfter: currentBalance + item.quantity,
            unitCost: new Prisma.Decimal(incomingCost),
            referenceType: 'purchase_order',
            referenceId: id,
            createdBy: userId ?? undefined,
          },
        });

        await db.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: item.quantity } });
      }

      // Conta a pagar: vencimento = recebimento + prazo de pagamento do fornecedor.
      const total = po.items.reduce((acc, it) => acc + it.quantity * Number(it.unitCost), 0);
      let paymentTermDays = 0;
      if (po.supplierId) {
        const sup = await db.supplier.findFirst({ where: { id: po.supplierId, companyId }, select: { paymentTermDays: true } });
        paymentTermDays = sup?.paymentTermDays ?? 0;
      }
      await db.payable.create({
        data: {
          companyId,
          supplierId: po.supplierId ?? undefined,
          sourceType: 'purchase_order',
          sourceId: id,
          description: 'Compra recebida',
          amount: new Prisma.Decimal(total),
          dueDate: new Date(now.getTime() + paymentTermDays * 86_400_000),
          createdBy: userId ?? undefined,
        },
      });

      await db.purchaseOrder.update({ where: { id }, data: { status: PrismaStatus.RECEIVED, receivedAt: now } });
    });
  }

  async cancel(id: string): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.purchaseOrder.updateMany({
        where: { id, companyId: this.companyId, status: { in: [PrismaStatus.DRAFT, PrismaStatus.SENT] } },
        data: { status: PrismaStatus.CANCELLED },
      });
    });
  }
}
