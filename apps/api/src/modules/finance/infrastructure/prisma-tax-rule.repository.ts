import { Injectable } from '@nestjs/common';
import { Prisma, TaxRegime } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { TaxRuleInput, TaxRuleRepository, TaxRuleRow } from '../domain/tax-rule.repository';

type DbTaxRule = { id: string; regime: TaxRegime; category: string | null; rate: Prisma.Decimal; note: string | null };

/** Persistência de regras de imposto (RLS via runInTransaction + filtro company). */
@Injectable()
export class PrismaTaxRuleRepository implements TaxRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  private toRow(r: DbTaxRule): TaxRuleRow {
    return { id: r.id, regime: r.regime, category: r.category, rate: Number(r.rate), note: r.note };
  }

  async list(): Promise<TaxRuleRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.taxRule.findMany({
        where: { companyId: this.companyId },
        orderBy: [{ regime: 'asc' }, { category: 'asc' }],
      });
      return rows.map((r) => this.toRow(r as DbTaxRule));
    });
  }

  async upsert(input: TaxRuleInput): Promise<TaxRuleRow> {
    return this.prisma.runInTransaction(async () => {
      const existing = await this.prisma.db.taxRule.findFirst({
        where: { companyId: this.companyId, regime: input.regime as TaxRegime, category: input.category },
      });
      const data = { rate: new Prisma.Decimal(input.rate), note: input.note ?? null };
      const saved = existing
        ? await this.prisma.db.taxRule.update({ where: { id: existing.id }, data })
        : await this.prisma.db.taxRule.create({
            data: {
              companyId: this.companyId,
              regime: input.regime as TaxRegime,
              category: input.category,
              ...data,
            },
          });
      return this.toRow(saved as DbTaxRule);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const result = await this.prisma.db.taxRule.deleteMany({ where: { id, companyId: this.companyId } });
      return result.count > 0;
    });
  }
}
