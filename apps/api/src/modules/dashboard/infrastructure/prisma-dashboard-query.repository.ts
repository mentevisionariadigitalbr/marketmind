import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { requireTenant } from '../../../shared/tenant/tenant-context';
import type {
  DashboardQueryPort,
  RevenueAggregate,
  TimelinePoint,
  ProductRevenueRow,
  CategoryRevenueRow,
  InventorySummary,
  ProductListFilter,
  PageRequest,
  Paged,
  ProductListRow,
  ProductSignal,
  DateRange,
} from '@marketmind/dashboard-core';

/**
 * Adapter de leitura analítica sobre o schema OPERACIONAL (Sprint 3.1).
 * Toda query é tenant-scoped por `company_id` (defesa em profundidade) e roda
 * dentro de `runInTransaction`, que fixa `app.current_company` → ativa o RLS.
 *
 * As materialized views projetadas em docs/dashboard-api.md são a evolução
 * natural destas queries; os contratos (DashboardQueryPort) não mudam.
 */
@Injectable()
export class PrismaDashboardQueryRepository implements DashboardQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  /** Executa `fn` com `prisma.db` já dentro de uma transação RLS-aware. */
  private run<T>(fn: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.runInTransaction(() => fn(this.prisma.db));
  }

  async getRevenue(range: DateRange): Promise<RevenueAggregate> {
    return this.run(async (db) => {
      const [agg] = await db.$queryRaw<
        { revenue: number; orders: number; commission: number; freight: number; distinct_customers: number }[]
      >`
        SELECT COALESCE(SUM(gross_amount), 0)::float8       AS revenue,
               COUNT(*)::int                                AS orders,
               COALESCE(SUM(commission_amount), 0)::float8  AS commission,
               COALESCE(SUM(freight_amount), 0)::float8     AS freight,
               COUNT(DISTINCT customer_id)::int             AS distinct_customers
        FROM orders
        WHERE company_id = ${this.companyId}::uuid
          AND ordered_at >= ${range.from} AND ordered_at < ${range.to}`;

      const [units] = await db.$queryRaw<{ units: number }[]>`
        SELECT COALESCE(SUM(oi.quantity), 0)::int AS units
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.company_id = ${this.companyId}::uuid
          AND o.ordered_at >= ${range.from} AND o.ordered_at < ${range.to}`;

      return {
        revenue: agg?.revenue ?? 0,
        orders: agg?.orders ?? 0,
        commission: agg?.commission ?? 0,
        freight: agg?.freight ?? 0,
        distinctCustomers: agg?.distinct_customers ?? 0,
        unitsSold: units?.units ?? 0,
      };
    });
  }

  /** date_trunc unit é um VALOR (parametrizável com segurança). */
  private truncUnit(range: DateRange): 'day' | 'month' {
    const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
    return days > 92 ? 'month' : 'day';
  }

  async getTimeline(range: DateRange): Promise<TimelinePoint[]> {
    const unit = this.truncUnit(range);
    return this.run(async (db) => {
      const sales = await db.$queryRaw<{ bucket: Date; revenue: number; orders: number }[]>`
        SELECT date_trunc(${unit}, ordered_at)        AS bucket,
               COALESCE(SUM(gross_amount), 0)::float8  AS revenue,
               COUNT(*)::int                           AS orders
        FROM orders
        WHERE company_id = ${this.companyId}::uuid
          AND ordered_at >= ${range.from} AND ordered_at < ${range.to}
        GROUP BY 1 ORDER BY 1`;

      const units = await db.$queryRaw<{ bucket: Date; units_sold: number }[]>`
        SELECT date_trunc(${unit}, o.ordered_at)    AS bucket,
               COALESCE(SUM(oi.quantity), 0)::int    AS units_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.company_id = ${this.companyId}::uuid
          AND o.ordered_at >= ${range.from} AND o.ordered_at < ${range.to}
        GROUP BY 1 ORDER BY 1`;

      const unitsByBucket = new Map(units.map((u) => [u.bucket.toISOString(), u.units_sold]));
      return sales.map((s) => ({
        bucket: s.bucket.toISOString().slice(0, 10),
        revenue: s.revenue,
        orders: s.orders,
        unitsSold: unitsByBucket.get(s.bucket.toISOString()) ?? 0,
      }));
    });
  }

  private productRevenueQuery(range: DateRange, limit?: number): Prisma.Sql {
    const limitSql = limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;
    return Prisma.sql`
      SELECT oi.product_id                                  AS product_id,
             p.sku                                          AS sku,
             COALESCE(p.title, oi.title)                    AS title,
             COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float8 AS revenue,
             COALESCE(SUM(oi.quantity), 0)::int             AS units_sold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.company_id = ${this.companyId}::uuid
        AND oi.product_id IS NOT NULL
        AND o.ordered_at >= ${range.from} AND o.ordered_at < ${range.to}
      GROUP BY oi.product_id, p.sku, COALESCE(p.title, oi.title)
      ORDER BY revenue DESC
      ${limitSql}`;
  }

  async getTopProducts(range: DateRange, limit: number): Promise<ProductRevenueRow[]> {
    return this.run(async (db) => {
      const rows = await db.$queryRaw<
        { product_id: string; sku: string | null; title: string; revenue: number; units_sold: number }[]
      >(this.productRevenueQuery(range, limit));
      return rows.map((r) => ({
        productId: r.product_id,
        sku: r.sku,
        title: r.title,
        revenue: r.revenue,
        unitsSold: r.units_sold,
      }));
    });
  }

  async getProductRevenue(range: DateRange): Promise<ProductRevenueRow[]> {
    return this.run(async (db) => {
      const rows = await db.$queryRaw<
        { product_id: string; sku: string | null; title: string; revenue: number; units_sold: number }[]
      >(this.productRevenueQuery(range));
      return rows.map((r) => ({
        productId: r.product_id,
        sku: r.sku,
        title: r.title,
        revenue: r.revenue,
        unitsSold: r.units_sold,
      }));
    });
  }

  private async categoryRevenue(range: DateRange, limit?: number): Promise<CategoryRevenueRow[]> {
    const limitSql = limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;
    return this.run(async (db) => {
      const rows = await db.$queryRaw<
        { category_id: string | null; name: string | null; revenue: number; units_sold: number; product_count: number }[]
      >(Prisma.sql`
        SELECT p.category_id                                  AS category_id,
               c.name                                         AS name,
               COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float8 AS revenue,
               COALESCE(SUM(oi.quantity), 0)::int             AS units_sold,
               COUNT(DISTINCT p.id)::int                      AS product_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.external_id = p.category_id
        WHERE oi.company_id = ${this.companyId}::uuid
          AND o.ordered_at >= ${range.from} AND o.ordered_at < ${range.to}
        GROUP BY p.category_id, c.name
        ORDER BY revenue DESC
        ${limitSql}`);
      return rows.map((r) => ({
        categoryId: r.category_id ?? 'uncategorized',
        name: r.name ?? 'Sem categoria',
        revenue: r.revenue,
        unitsSold: r.units_sold,
        productCount: r.product_count,
      }));
    });
  }

  getTopCategories(range: DateRange, limit: number): Promise<CategoryRevenueRow[]> {
    return this.categoryRevenue(range, limit);
  }

  getCategoryBreakdown(range: DateRange): Promise<CategoryRevenueRow[]> {
    return this.categoryRevenue(range);
  }

  async getInventorySummary(lowStockThreshold = 5): Promise<InventorySummary> {
    return this.run(async (db) => {
      const [row] = await db.$queryRaw<
        { active_products: number; without_stock: number; critical_stock: number; total_units: number; value_at_price: number }[]
      >`
        WITH stock AS (
          SELECT p.id, p.status, COALESCE(p.price, 0) AS price,
                 COALESCE(SUM(i.available), 0)::int AS on_hand
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          WHERE p.company_id = ${this.companyId}::uuid
          GROUP BY p.id, p.status, p.price
        )
        SELECT COUNT(*) FILTER (WHERE status = 'active')::int     AS active_products,
               COUNT(*) FILTER (WHERE on_hand = 0)::int           AS without_stock,
               COUNT(*) FILTER (WHERE status = 'active' AND on_hand > 0 AND on_hand <= ${lowStockThreshold})::int AS critical_stock,
               COALESCE(SUM(on_hand), 0)::int                     AS total_units,
               COALESCE(SUM(on_hand * price), 0)::float8          AS value_at_price
        FROM stock`;
      const totalUnits = row?.total_units ?? 0;
      return {
        activeProducts: row?.active_products ?? 0,
        productsWithoutStock: row?.without_stock ?? 0,
        criticalStock: row?.critical_stock ?? 0,
        totalUnitsOnHand: totalUnits,
        valueAtPrice: row?.value_at_price ?? 0,
        valueAtCost: null, // requer product_costs (ver dashboard-architecture.md)
        averageInventoryUnits: totalUnits, // aproximação point-in-time (sem snapshot histórico)
      };
    });
  }

  async listProducts(
    filter: ProductListFilter,
    page: PageRequest,
    range: DateRange,
  ): Promise<Paged<ProductListRow>> {
    const conditions: Prisma.Sql[] = [Prisma.sql`p.company_id = ${this.companyId}::uuid`];
    if (filter.sku) conditions.push(Prisma.sql`p.sku ILIKE ${`%${filter.sku}%`}`);
    if (filter.title) conditions.push(Prisma.sql`p.title ILIKE ${`%${filter.title}%`}`);
    if (filter.categoryId) conditions.push(Prisma.sql`p.category_id = ${filter.categoryId}`);
    if (filter.marketplaceAccountId)
      conditions.push(Prisma.sql`p.marketplace_account_id = ${filter.marketplaceAccountId}::uuid`);
    if (filter.status) conditions.push(Prisma.sql`p.status = ${filter.status}`);
    if (filter.minPrice !== undefined) conditions.push(Prisma.sql`p.price >= ${filter.minPrice}`);
    if (filter.maxPrice !== undefined) conditions.push(Prisma.sql`p.price <= ${filter.maxPrice}`);
    const whereSql = Prisma.join(conditions, ' AND ');

    const stockConds: Prisma.Sql[] = [];
    if (filter.minStock !== undefined) stockConds.push(Prisma.sql`b.stock >= ${filter.minStock}`);
    if (filter.maxStock !== undefined) stockConds.push(Prisma.sql`b.stock <= ${filter.maxStock}`);
    const havingSql = stockConds.length ? Prisma.sql`WHERE ${Prisma.join(stockConds, ' AND ')}` : Prisma.empty;

    const pageSize = Math.min(Math.max(page.pageSize, 1), 100);
    const offset = (Math.max(page.page, 1) - 1) * pageSize;

    return this.run(async (db) => {
      const rows = await db.$queryRaw<
        {
          id: string; sku: string | null; title: string; thumbnail: string | null;
          category_id: string | null; status: string; price: number; stock: number;
          revenue: number; units_sold: number; total_count: number;
        }[]
      >(Prisma.sql`
        WITH base AS (
          SELECT p.id, p.sku, p.title, p.thumbnail, p.category_id, p.status,
                 COALESCE(p.price, 0)::float8 AS price,
                 COALESCE((SELECT SUM(i.available) FROM inventory i WHERE i.product_id = p.id), 0)::int AS stock
          FROM products p
          WHERE ${whereSql}
        ),
        sales AS (
          SELECT oi.product_id,
                 SUM(oi.quantity * oi.unit_price)::float8 AS revenue,
                 SUM(oi.quantity)::int AS units_sold
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.company_id = ${this.companyId}::uuid
            AND o.ordered_at >= ${range.from} AND o.ordered_at < ${range.to}
          GROUP BY oi.product_id
        )
        SELECT b.id, b.sku, b.title, b.thumbnail, b.category_id, b.status, b.price, b.stock,
               COALESCE(s.revenue, 0)::float8 AS revenue,
               COALESCE(s.units_sold, 0)::int AS units_sold,
               COUNT(*) OVER()::int AS total_count
        FROM base b
        LEFT JOIN sales s ON s.product_id = b.id
        ${havingSql}
        ORDER BY revenue DESC NULLS LAST, b.title ASC
        LIMIT ${pageSize} OFFSET ${offset}`);

      const total = rows.length > 0 ? rows[0].total_count : 0;
      return {
        items: rows.map((r) => ({
          productId: r.id,
          sku: r.sku,
          title: r.title,
          thumbnail: r.thumbnail,
          categoryId: r.category_id,
          status: r.status,
          price: r.price,
          stock: r.stock,
          revenue: r.revenue,
          unitsSold: r.units_sold,
          profit: null, // requer product_costs
          marginPct: null, // requer product_costs
        })),
        page: page.page,
        pageSize,
        total,
      };
    });
  }

  async getProductSignals(current: DateRange, previous: DateRange): Promise<ProductSignal[]> {
    return this.run(async (db) => {
      const rows = await db.$queryRaw<
        { id: string; sku: string | null; title: string; status: string; stock: number; units_current: number; units_previous: number }[]
      >`
        SELECT p.id, p.sku, p.title, p.status,
               COALESCE((SELECT SUM(i.available) FROM inventory i WHERE i.product_id = p.id), 0)::int AS stock,
               COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
                         WHERE oi.product_id = p.id AND o.ordered_at >= ${current.from} AND o.ordered_at < ${current.to}), 0)::int AS units_current,
               COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
                         WHERE oi.product_id = p.id AND o.ordered_at >= ${previous.from} AND o.ordered_at < ${previous.to}), 0)::int AS units_previous
        FROM products p
        WHERE p.company_id = ${this.companyId}::uuid`;
      return rows.map((r) => ({
        productId: r.id,
        sku: r.sku,
        title: r.title,
        status: r.status,
        stock: r.stock,
        unitsSoldCurrent: r.units_current,
        unitsSoldPrevious: r.units_previous,
        marginPct: null,
      }));
    });
  }
}
