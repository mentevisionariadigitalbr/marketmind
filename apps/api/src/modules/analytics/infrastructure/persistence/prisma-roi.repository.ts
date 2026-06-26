import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { ProductRoiRaw, RoiRepository, SupplierRoiRaw } from '../../domain/ports/roi.repository';

@Injectable()
export class PrismaRoiRepository implements RoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async productRoi(days: number): Promise<ProductRoiRaw[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      return this.prisma.db.$queryRaw<ProductRoiRaw[]>`
        SELECT
          p.id                 AS "productId",
          p.sku                AS "sku",
          p.internal_sku       AS "internalSku",
          p.title              AS "title",
          p.internal_title     AS "internalTitle",
          p.price::float8      AS "price",
          p.promo_price::float8 AS "promoPrice",
          s.revenue            AS "revenue",
          s.units              AS "units",
          c.unit_cost          AS "unitCost"
        FROM products p
        JOIN LATERAL (
          SELECT SUM(oi.quantity * oi.unit_price)::float8 AS revenue, SUM(oi.quantity)::int AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - (${days} * interval '1 day')
        ) s ON s.units > 0
        LEFT JOIN LATERAL (
          SELECT (pc.acquisition_cost + pc.inbound_freight + pc.packaging_cost + pc.other_cost)::float8 AS unit_cost
          FROM product_costs pc
          WHERE pc.product_id = p.id AND pc.valid_from <= now()
          ORDER BY (pc.variant_id IS NULL) DESC, pc.valid_from DESC
          LIMIT 1
        ) c ON true
        WHERE p.company_id = ${companyId}::uuid
        ORDER BY s.revenue DESC
      `;
    });
  }

  async supplierRoi(days: number): Promise<SupplierRoiRaw[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      return this.prisma.db.$queryRaw<SupplierRoiRaw[]>`
        SELECT
          sup.id                          AS "supplierId",
          sup.name                        AS "name",
          COALESCE(sales.revenue, 0)      AS "revenue",
          COALESCE(sales.cogs, 0)         AS "cogs",
          COALESCE(sales.products_sold, 0) AS "productsSold",
          COALESCE(pur.purchased, 0)      AS "purchased"
        FROM suppliers sup
        LEFT JOIN LATERAL (
          SELECT
            SUM(oi.quantity * oi.unit_price)::float8 AS revenue,
            SUM(oi.quantity * COALESCE(c.unit_cost, 0))::float8 AS cogs,
            COUNT(DISTINCT p.id)::int AS products_sold
          FROM products p
          JOIN order_items oi ON oi.product_id = p.id
          JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID' AND o.ordered_at >= now() - (${days} * interval '1 day')
          LEFT JOIN LATERAL (
            SELECT (pc.acquisition_cost + pc.inbound_freight + pc.packaging_cost + pc.other_cost)::float8 AS unit_cost
            FROM product_costs pc
            WHERE pc.product_id = p.id AND pc.valid_from <= now()
            ORDER BY (pc.variant_id IS NULL) DESC, pc.valid_from DESC
            LIMIT 1
          ) c ON true
          WHERE p.supplier_id = sup.id
        ) sales ON true
        LEFT JOIN LATERAL (
          SELECT SUM(poi.quantity * poi.unit_cost)::float8 AS purchased
          FROM purchase_orders po JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
          WHERE po.supplier_id = sup.id AND po.status = 'RECEIVED' AND po.received_at >= now() - (${days} * interval '1 day')
        ) pur ON true
        WHERE sup.company_id = ${companyId}::uuid
        ORDER BY sup.name ASC
      `;
    });
  }
}
