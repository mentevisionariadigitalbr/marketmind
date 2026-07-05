import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { DigestDataRepository } from '../../domain/ports/digest-data.repository';
import type { DigestData } from '../../application/digest';

type Raw = {
  companyName: string;
  revenue7d: number;
  orders7d: number;
  units7d: number;
  outOfStock: number;
  lowStock: number;
  payablesPending: number;
  payablesOverdue: number;
};

@Injectable()
export class PrismaDigestDataRepository implements DigestDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async forCompany(): Promise<DigestData> {
    return this.prisma.runInTransaction(async () => {
      const companyId = requireTenant().companyId;
      const [row] = await this.prisma.db.$queryRaw<Raw[]>`
        SELECT
          (SELECT name FROM companies WHERE id = ${companyId}::uuid) AS "companyName",
          COALESCE((SELECT SUM(gross_amount) FROM orders
                    WHERE company_id = ${companyId}::uuid AND status = 'PAID' AND ordered_at >= now() - interval '7 days'), 0)::float8 AS "revenue7d",
          COALESCE((SELECT COUNT(*) FROM orders
                    WHERE company_id = ${companyId}::uuid AND status = 'PAID' AND ordered_at >= now() - interval '7 days'), 0)::int AS "orders7d",
          COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id = oi.order_id
                    WHERE oi.company_id = ${companyId}::uuid AND o.status = 'PAID' AND o.ordered_at >= now() - interval '7 days'), 0)::int AS "units7d",
          COALESCE((SELECT COUNT(*) FROM products p
                    WHERE p.company_id = ${companyId}::uuid AND p.status = 'active' AND COALESCE(p.available_quantity, 0) <= 0), 0)::int AS "outOfStock",
          COALESCE((SELECT COUNT(*) FROM products p
                    WHERE p.company_id = ${companyId}::uuid AND p.status = 'active' AND COALESCE(p.available_quantity, 0) > 0 AND COALESCE(p.available_quantity, 0) <= 5), 0)::int AS "lowStock",
          COALESCE((SELECT SUM(amount) FROM payables
                    WHERE company_id = ${companyId}::uuid AND status = 'PENDING'), 0)::float8 AS "payablesPending",
          COALESCE((SELECT SUM(amount) FROM payables
                    WHERE company_id = ${companyId}::uuid AND status = 'PENDING' AND due_date < now()), 0)::float8 AS "payablesOverdue"
      `;
      return {
        companyName: row?.companyName ?? 'Sua empresa',
        revenue7d: row?.revenue7d ?? 0,
        orders7d: row?.orders7d ?? 0,
        units7d: row?.units7d ?? 0,
        outOfStock: row?.outOfStock ?? 0,
        lowStock: row?.lowStock ?? 0,
        payablesPending: row?.payablesPending ?? 0,
        payablesOverdue: row?.payablesOverdue ?? 0,
      };
    });
  }
}
