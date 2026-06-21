import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import { PlanRecord, PlanRepository } from '../../domain/ports/plan.repository';

type DbPlan = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  maxMarketplaceAccounts: number | null;
  maxProducts: number | null;
  historyWindowDays: number | null;
  stripePriceId: string | null;
  active: boolean;
};

/** Catálogo de planos (tabela global, sem RLS). */
@Injectable()
export class PrismaPlanRepository implements PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(p: DbPlan): PlanRecord {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      priceCents: p.priceCents,
      currency: p.currency,
      interval: p.interval,
      trialDays: p.trialDays,
      maxMarketplaceAccounts: p.maxMarketplaceAccounts,
      maxProducts: p.maxProducts,
      historyWindowDays: p.historyWindowDays,
      stripePriceId: p.stripePriceId,
      active: p.active,
    };
  }

  async listActive(): Promise<PlanRecord[]> {
    const rows = await this.prisma.db.plan.findMany({
      where: { active: true },
      orderBy: { priceCents: 'asc' },
    });
    return rows.map((r) => this.toRecord(r as DbPlan));
  }

  async findByCode(code: string): Promise<PlanRecord | null> {
    const row = await this.prisma.db.plan.findUnique({ where: { code } });
    return row ? this.toRecord(row as DbPlan) : null;
  }

  async findById(id: string): Promise<PlanRecord | null> {
    const row = await this.prisma.db.plan.findUnique({ where: { id } });
    return row ? this.toRecord(row as DbPlan) : null;
  }
}
