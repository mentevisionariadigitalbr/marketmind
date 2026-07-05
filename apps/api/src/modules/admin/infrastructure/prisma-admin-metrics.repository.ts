import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import { AdminMetricsRepository } from '../domain/ports/admin-metrics.repository';
import { PlanRow, SubscriptionRow, SubStatus } from '../domain/saas-metrics';

/**
 * Lê todas as assinaturas/planos SEM contexto de tenant (admin não tem companyId →
 * GUC vazia → RLS aberta). Isolamento não se aplica: é leitura agregada da plataforma.
 */
@Injectable()
export class PrismaAdminMetricsRepository implements AdminMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadSubscriptions(): Promise<SubscriptionRow[]> {
    const rows = await this.prisma.db.subscription.findMany({
      select: { status: true, planId: true, trialEndsAt: true, canceledAt: true },
    });
    return rows.map((r) => ({
      status: r.status as SubStatus,
      planId: r.planId,
      trialEndsAt: r.trialEndsAt,
      canceledAt: r.canceledAt,
    }));
  }

  async loadPlans(): Promise<PlanRow[]> {
    const rows = await this.prisma.db.plan.findMany({
      select: { id: true, code: true, name: true, priceCents: true, interval: true },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      priceCents: r.priceCents,
      interval: r.interval,
    }));
  }
}
