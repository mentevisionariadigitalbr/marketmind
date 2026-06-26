import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { ChannelSummaryRow, ChannelsRepository } from '../../domain/ports/channels.repository';
import type { ParsedSale } from '../../application/manual-sales-csv';

@Injectable()
export class PrismaChannelsRepository implements ChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async getOrCreateManualAccountId(): Promise<string> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      const marketplace = await this.prisma.db.marketplace.findUnique({ where: { code: 'MANUAL' }, select: { id: true } });
      if (!marketplace) throw new Error('Marketplace MANUAL não encontrado');

      const existing = await this.prisma.db.marketplaceAccount.findFirst({
        where: { companyId, marketplaceId: marketplace.id, externalUserId: 'manual' },
        select: { id: true },
      });
      if (existing) return existing.id;

      const created = await this.prisma.db.marketplaceAccount.create({
        data: {
          companyId,
          marketplaceId: marketplace.id,
          externalUserId: 'manual',
          nickname: 'Manual / Outros',
          accessTokenEnc: '-',
          refreshTokenEnc: '-',
          tokenExpiresAt: new Date('2999-12-31T00:00:00Z'),
        },
        select: { id: true },
      });
      return created.id;
    });
  }

  async importSales(accountId: string, rows: ParsedSale[]): Promise<{ imported: number }> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      let imported = 0;
      for (const row of rows) {
        const product = await this.prisma.db.product.findFirst({
          where: { companyId, sku: row.sku },
          select: { id: true, title: true },
        });
        const order = await this.prisma.db.order.upsert({
          where: { marketplaceAccountId_externalId: { marketplaceAccountId: accountId, externalId: row.externalId } },
          update: {
            status: 'PAID',
            orderedAt: new Date(`${row.date}T12:00:00Z`),
            grossAmount: new Prisma.Decimal(row.gross),
            commissionAmount: new Prisma.Decimal(row.commission),
            freightAmount: new Prisma.Decimal(row.freight),
          },
          create: {
            companyId,
            marketplaceAccountId: accountId,
            externalId: row.externalId,
            status: 'PAID',
            currency: 'BRL',
            orderedAt: new Date(`${row.date}T12:00:00Z`),
            grossAmount: new Prisma.Decimal(row.gross),
            commissionAmount: new Prisma.Decimal(row.commission),
            freightAmount: new Prisma.Decimal(row.freight),
          },
          select: { id: true },
        });

        await this.prisma.db.orderItem.deleteMany({ where: { orderId: order.id } });
        await this.prisma.db.orderItem.create({
          data: {
            companyId,
            orderId: order.id,
            productId: product?.id ?? undefined,
            externalItemId: `${row.externalId}:1`,
            sku: row.sku,
            title: product?.title ?? `Venda manual ${row.sku}`,
            quantity: row.quantity,
            unitPrice: new Prisma.Decimal(row.unitPrice),
          },
        });
        imported += 1;
      }
      return { imported };
    });
  }

  async channelSummary(days: number): Promise<ChannelSummaryRow[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      return this.prisma.db.$queryRaw<ChannelSummaryRow[]>`
        SELECT
          mk.code                       AS "marketplaceCode",
          ma.nickname                   AS "nickname",
          COALESCE(ord.revenue, 0)::float8 AS "revenue",
          COALESCE(ord.orders, 0)::int     AS "orders",
          COALESCE(u.units, 0)::int        AS "units"
        FROM marketplace_accounts ma
        JOIN marketplaces mk ON mk.id = ma.marketplace_id
        LEFT JOIN LATERAL (
          SELECT SUM(o.gross_amount) AS revenue, COUNT(*) AS orders
          FROM orders o
          WHERE o.marketplace_account_id = ma.id AND o.status = 'PAID' AND o.ordered_at >= now() - (${days} * interval '1 day')
        ) ord ON true
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity) AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.marketplace_account_id = ma.id AND o.status = 'PAID' AND o.ordered_at >= now() - (${days} * interval '1 day')
        ) u ON true
        WHERE ma.company_id = ${companyId}::uuid
        ORDER BY "revenue" DESC NULLS LAST
      `;
    });
  }
}
