import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus as PrismaSubStatus } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  CreateTrialData,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../../domain/ports/subscription.repository';

type DbSubscription = {
  id: string;
  companyId: string;
  planId: string;
  status: PrismaSubStatus;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string };
};

/** Persistência da assinatura (RLS via runInTransaction + filtro de company). */
@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  private toRecord(s: DbSubscription): SubscriptionRecord {
    return {
      id: s.id,
      companyId: s.companyId,
      planId: s.planId,
      planCode: s.plan.code,
      status: s.status,
      provider: s.provider,
      providerCustomerId: s.providerCustomerId,
      providerSubscriptionId: s.providerSubscriptionId,
      trialEndsAt: s.trialEndsAt,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    };
  }

  async findForCurrentCompany(): Promise<SubscriptionRecord | null> {
    return this.prisma.runInTransaction(async () => {
      const row = await this.prisma.db.subscription.findFirst({
        where: { companyId: this.companyId },
        include: { plan: { select: { code: true } } },
      });
      return row ? this.toRecord(row as DbSubscription) : null;
    });
  }

  async createTrialIfAbsent(data: CreateTrialData): Promise<SubscriptionRecord> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      try {
        const created = await this.prisma.db.subscription.create({
          data: {
            companyId,
            planId: data.planId,
            status: 'TRIALING',
            trialStartedAt: data.trialStartedAt,
            trialEndsAt: data.trialEndsAt,
          },
          include: { plan: { select: { code: true } } },
        });
        return this.toRecord(created as DbSubscription);
      } catch (err) {
        // Corrida: outra requisição já criou (unique em company_id) — relê.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const row = await this.prisma.db.subscription.findFirst({
            where: { companyId },
            include: { plan: { select: { code: true } } },
          });
          if (row) return this.toRecord(row as DbSubscription);
        }
        throw err;
      }
    });
  }

  async setProviderCustomer(data: { provider: string; customerId: string }): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.subscription.updateMany({
        where: { companyId: this.companyId },
        data: { provider: data.provider, providerCustomerId: data.customerId },
      });
    });
  }
}
