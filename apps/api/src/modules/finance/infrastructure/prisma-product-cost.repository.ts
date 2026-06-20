import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  ProductCostInput,
  ProductCostRepository,
  ProductsWithCostPage,
} from '../domain/product-cost.repository';

/** Persistência de custos (RLS via runInTransaction + filtro explícito de company). */
@Injectable()
export class PrismaProductCostRepository implements ProductCostRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async listProductsWithCost(
    page: number,
    pageSize: number,
    filter: { sku?: string; title?: string; onlyMissing?: boolean },
  ): Promise<ProductsWithCostPage> {
    const size = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * size;

    const conds: Prisma.Sql[] = [Prisma.sql`p.company_id = ${this.companyId}::uuid`];
    if (filter.sku) conds.push(Prisma.sql`p.sku ILIKE ${`%${filter.sku}%`}`);
    if (filter.title) conds.push(Prisma.sql`p.title ILIKE ${`%${filter.title}%`}`);
    const whereSql = Prisma.join(conds, ' AND ');
    const missingSql = filter.onlyMissing ? Prisma.sql`WHERE c.unit_cost IS NULL` : Prisma.empty;

    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.$queryRaw<
        { id: string; sku: string | null; title: string; status: string; price: number; unit_cost: number | null; total_count: number }[]
      >(Prisma.sql`
        WITH base AS (
          SELECT p.id, p.sku, p.title, p.status, COALESCE(p.price, 0)::float8 AS price
          FROM products p
          WHERE ${whereSql}
        )
        SELECT b.id, b.sku, b.title, b.status, b.price, c.unit_cost,
               COUNT(*) OVER()::int AS total_count
        FROM base b
        LEFT JOIN LATERAL (
          SELECT (pc.acquisition_cost + pc.inbound_freight + pc.packaging_cost + pc.other_cost)::float8 AS unit_cost
          FROM product_costs pc
          WHERE pc.company_id = ${this.companyId}::uuid AND pc.product_id = b.id AND pc.valid_from <= now()
          ORDER BY (pc.variant_id IS NULL) DESC, pc.valid_from DESC
          LIMIT 1
        ) c ON true
        ${missingSql}
        ORDER BY (c.unit_cost IS NULL) DESC, b.title ASC
        LIMIT ${size} OFFSET ${offset}`);

      const total = rows.length > 0 ? rows[0].total_count : 0;
      return {
        items: rows.map((r) => ({
          productId: r.id,
          sku: r.sku,
          title: r.title,
          status: r.status,
          price: r.price,
          currentUnitCost: r.unit_cost,
          hasCost: r.unit_cost !== null,
        })),
        total,
      };
    });
  }

  async createCost(input: ProductCostInput): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.productCost.create({
        data: {
          companyId: this.companyId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          sku: input.sku ?? null,
          acquisitionCost: new Prisma.Decimal(input.acquisitionCost),
          inboundFreight: new Prisma.Decimal(input.inboundFreight),
          packagingCost: new Prisma.Decimal(input.packagingCost),
          otherCost: new Prisma.Decimal(input.otherCost),
          validFrom: input.validFrom ?? new Date(),
          note: input.note ?? null,
        },
      });
    });
  }

  async findProductIdBySku(sku: string): Promise<string | null> {
    return this.prisma.runInTransaction(async () => {
      const found = await this.prisma.db.product.findFirst({
        where: { companyId: this.companyId, sku },
        select: { id: true },
      });
      return found?.id ?? null;
    });
  }
}
