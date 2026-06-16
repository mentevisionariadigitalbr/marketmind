import { Injectable } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  NormalizedOrder,
  OrderSyncRepository,
  UpsertOrderResult,
} from '../../domain/ports/order-sync.repository';

@Injectable()
export class PrismaOrderSyncRepository implements OrderSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertOrder(order: NormalizedOrder): Promise<UpsertOrderResult> {
    return this.prisma.runInTransaction(async () => {
      const db = this.prisma.db;

      const customerId = order.customer
        ? (
            await db.customer.upsert({
              where: {
                companyId_externalId: {
                  companyId: order.companyId,
                  externalId: order.customer.externalId,
                },
              },
              create: {
                companyId: order.companyId,
                externalId: order.customer.externalId,
                nickname: order.customer.nickname ?? undefined,
              },
              update: { nickname: order.customer.nickname ?? undefined },
              select: { id: true },
            })
          ).id
        : null;

      const existing = await db.order.findUnique({
        where: {
          marketplaceAccountId_externalId: {
            marketplaceAccountId: order.marketplaceAccountId,
            externalId: order.externalId,
          },
        },
        select: { id: true },
      });

      const data = {
        companyId: order.companyId,
        marketplaceAccountId: order.marketplaceAccountId,
        customerId,
        externalId: order.externalId,
        status: order.status as PrismaOrderStatus,
        currency: order.currency,
        grossAmount: order.grossAmount,
        freightAmount: order.freightAmount,
        commissionAmount: order.commissionAmount,
        orderedAt: order.orderedAt,
      };

      const orderId = existing
        ? (await db.order.update({ where: { id: existing.id }, data, select: { id: true } })).id
        : (await db.order.create({ data, select: { id: true } })).id;

      // Itens: substitui para refletir o estado mais recente sem duplicar.
      await db.orderItem.deleteMany({ where: { orderId } });
      if (order.items.length > 0) {
        await db.orderItem.createMany({
          data: order.items.map((item) => ({
            companyId: order.companyId,
            orderId,
            externalItemId: item.externalItemId,
            sku: item.sku ?? undefined,
            title: item.title,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            itemCommission: item.itemCommission,
          })),
        });
      }

      return { created: !existing };
    });
  }
}
