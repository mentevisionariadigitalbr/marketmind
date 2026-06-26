import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  AdminPlanView,
  AdminPlansRepository,
  CreatePlanData,
  UpdatePlanData,
} from '../domain/ports/admin-plans.repository';
import { PlanCodeInUseError } from '../domain/errors';

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
  createdAt: Date;
};

/** CRUD de planos (tabela global, sem RLS). Catálogo da plataforma. */
@Injectable()
export class PrismaAdminPlansRepository implements AdminPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  private view(p: DbPlan): AdminPlanView {
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
      createdAt: p.createdAt.toISOString(),
    };
  }

  async listAll(): Promise<AdminPlanView[]> {
    const rows = await this.prisma.db.plan.findMany({ orderBy: { priceCents: 'asc' } });
    return rows.map((r) => this.view(r as DbPlan));
  }

  async findById(id: string): Promise<AdminPlanView | null> {
    const row = await this.prisma.db.plan.findUnique({ where: { id } });
    return row ? this.view(row as DbPlan) : null;
  }

  async create(data: CreatePlanData): Promise<AdminPlanView> {
    try {
      const row = await this.prisma.db.plan.create({ data });
      return this.view(row as DbPlan);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new PlanCodeInUseError(data.code);
      }
      throw err;
    }
  }

  async update(id: string, data: UpdatePlanData): Promise<AdminPlanView | null> {
    try {
      const row = await this.prisma.db.plan.update({ where: { id }, data });
      return this.view(row as DbPlan);
    } catch (err) {
      // P2025 = registro não encontrado.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return null;
      }
      throw err;
    }
  }
}
