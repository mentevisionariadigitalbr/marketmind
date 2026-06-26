import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { ForecastRepository, ForecastRow } from '../../domain/ports/forecast.repository';

type RawRow = {
  productId: string;
  sku: string | null;
  title: string;
  categoryId: string | null;
  available: number | null;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number | null;
  units30: number | null;
  units60: number | null;
  units90: number | null;
  lastSale: Date | null;
};

/** Consulta de previsão: estoque + velocidade de vendas (30/60/90d) + fornecedor. */
@Injectable()
export class PrismaForecastRepository implements ForecastRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchRows(): Promise<ForecastRow[]> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      const rows = await this.prisma.db.$queryRaw<RawRow[]>`
        SELECT
          p.id                       AS "productId",
          p.sku                      AS "sku",
          p.title                    AS "title",
          p.category_id              AS "categoryId",
          COALESCE(p.available_quantity, 0) AS "available",
          s.id                       AS "supplierId",
          s.name                     AS "supplierName",
          s.lead_time_days           AS "leadTimeDays",
          COALESCE(u30.units, 0)     AS "units30",
          COALESCE(u60.units, 0)     AS "units60",
          COALESCE(u90.units, 0)     AS "units90",
          ls.last_sale               AS "lastSale"
        FROM products p
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity)::int AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - interval '30 days'
        ) u30 ON true
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity)::int AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - interval '60 days'
        ) u60 ON true
        LEFT JOIN LATERAL (
          SELECT SUM(oi.quantity)::int AS units
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'PAID' AND o.ordered_at >= now() - interval '90 days'
        ) u90 ON true
        LEFT JOIN LATERAL (
          SELECT MAX(o.ordered_at) AS last_sale
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id
        ) ls ON true
        WHERE p.company_id = ${companyId}::uuid
      `;
      return rows.map((r) => ({
        productId: r.productId,
        sku: r.sku,
        title: r.title,
        categoryId: r.categoryId,
        available: r.available ?? 0,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        leadTimeDays: r.leadTimeDays,
        units30: r.units30 ?? 0,
        units60: r.units60 ?? 0,
        units90: r.units90 ?? 0,
        lastSale: r.lastSale ? r.lastSale.toISOString() : null,
      }));
    });
  }
}
