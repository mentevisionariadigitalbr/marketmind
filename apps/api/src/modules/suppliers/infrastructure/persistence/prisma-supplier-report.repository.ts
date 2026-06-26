import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { SupplierReportProductRaw, SupplierReportRepository } from '../../domain/ports/supplier-report.repository';

@Injectable()
export class PrismaSupplierReportRepository implements SupplierReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async products(supplierId: string, days: number): Promise<SupplierReportProductRaw[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      return this.prisma.db.$queryRaw<SupplierReportProductRaw[]>`
        SELECT
          p.id                  AS "productId",
          p.sku                 AS "sku",
          p.internal_sku        AS "internalSku",
          p.title               AS "title",
          p.internal_title      AS "internalTitle",
          COALESCE(p.available_quantity, 0) AS "available",
          COALESCE(s.units, 0)  AS "unitsSold",
          COALESCE(s.revenue, 0) AS "revenue",
          c.unit_cost           AS "unitCost"
        FROM products p
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity)::int AS units, SUM(oi.quantity * oi.unit_price)::float8 AS revenue
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - (${days} * interval '1 day')
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT (pc.acquisition_cost + pc.inbound_freight + pc.packaging_cost + pc.other_cost)::float8 AS unit_cost
          FROM product_costs pc
          WHERE pc.product_id = p.id AND pc.valid_from <= now()
          ORDER BY (pc.variant_id IS NULL) DESC, pc.valid_from DESC
          LIMIT 1
        ) c ON true
        WHERE p.company_id = ${companyId}::uuid AND p.supplier_id = ${supplierId}::uuid
        ORDER BY s.revenue DESC NULLS LAST, p.title ASC
      `;
    });
  }

  async purchased(supplierId: string, days: number): Promise<number> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.$queryRaw<{ purchased: number }[]>`
        SELECT COALESCE(SUM(poi.quantity * poi.unit_cost), 0)::float8 AS "purchased"
        FROM purchase_orders po JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
        WHERE po.supplier_id = ${supplierId}::uuid AND po.status = 'RECEIVED' AND po.received_at >= now() - (${days} * interval '1 day')
      `;
      return rows[0]?.purchased ?? 0;
    });
  }
}
