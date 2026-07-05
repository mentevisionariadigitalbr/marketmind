import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { PricingDefaultsRaw, PricingProductRaw, PricingRepository } from '../../domain/ports/pricing.repository';

@Injectable()
export class PrismaPricingRepository implements PricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async products(): Promise<PricingProductRaw[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      return this.prisma.db.$queryRaw<PricingProductRaw[]>`
        SELECT
          p.id              AS "productId",
          p.sku             AS "sku",
          p.internal_sku    AS "internalSku",
          p.title           AS "title",
          p.internal_title  AS "internalTitle",
          p.price::float8   AS "price",
          p.promo_price::float8 AS "promoPrice",
          c.unit_cost       AS "unitCost",
          COALESCE(s.units, 0) AS "units"
        FROM products p
        JOIN LATERAL (
          SELECT (pc.acquisition_cost + pc.inbound_freight + pc.packaging_cost + pc.other_cost)::float8 AS unit_cost
          FROM product_costs pc
          WHERE pc.company_id = p.company_id AND pc.product_id = p.id AND pc.variant_id IS NULL AND pc.valid_from <= now()
          ORDER BY pc.valid_from DESC
          LIMIT 1
        ) c ON true
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity)::int AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - interval '90 days'
        ) s ON true
        WHERE p.company_id = ${companyId}::uuid
        ORDER BY p.title ASC
      `;
    });
  }

  async defaults(): Promise<PricingDefaultsRaw> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      const rows = await this.prisma.db.$queryRaw<PricingDefaultsRaw[]>`
        SELECT
          COALESCE(SUM(o.commission_amount) / NULLIF(SUM(o.gross_amount), 0), 0)::float8 AS "commissionRate",
          COALESCE(SUM(o.freight_amount), 0)::float8 AS "totalFreight",
          COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi JOIN orders o2 ON o2.id = oi.order_id
            WHERE o2.company_id = ${companyId}::uuid AND o2.status = 'PAID'
          ), 0)::float8 AS "totalUnits"
        FROM orders o
        WHERE o.company_id = ${companyId}::uuid AND o.status = 'PAID'
      `;
      return rows[0] ?? { commissionRate: 0, totalFreight: 0, totalUnits: 0 };
    });
  }
}
