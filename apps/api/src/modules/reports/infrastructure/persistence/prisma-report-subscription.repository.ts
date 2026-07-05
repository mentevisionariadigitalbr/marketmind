import { Injectable } from '@nestjs/common';
import { ReportFrequency as PrismaFrequency } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  DueSubscription,
  ReportSubscription,
  ReportSubscriptionRepository,
  UpsertSubscriptionData,
} from '../../domain/ports/report-subscription.repository';
import type { ReportFrequency } from '../../application/digest';

@Injectable()
export class PrismaReportSubscriptionRepository implements ReportSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async getByCompany(): Promise<ReportSubscription | null> {
    return this.prisma.runInTransaction(async () => {
      const s = await this.prisma.db.reportSubscription.findUnique({ where: { companyId: this.companyId } });
      return s
        ? { frequency: s.frequency as ReportFrequency, recipients: s.recipients, enabled: s.enabled, lastSentAt: s.lastSentAt?.toISOString() ?? null }
        : null;
    });
  }

  async upsert(data: UpsertSubscriptionData): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      await this.prisma.db.reportSubscription.upsert({
        where: { companyId },
        update: { frequency: data.frequency as PrismaFrequency, recipients: data.recipients, enabled: data.enabled },
        create: { companyId, frequency: data.frequency as PrismaFrequency, recipients: data.recipients, enabled: data.enabled },
      });
    });
  }

  async markSent(now: Date): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.reportSubscription.updateMany({ where: { companyId: this.companyId }, data: { lastSentAt: now } });
    });
  }

  async listEnabled(): Promise<DueSubscription[]> {
    // Sem tenant ativo → RLS aberto (bootstrap). Usado apenas pelo agendador.
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.reportSubscription.findMany({ where: { enabled: true } });
      return rows.map((s) => ({
        companyId: s.companyId,
        frequency: s.frequency as ReportFrequency,
        recipients: s.recipients,
        lastSentAt: s.lastSentAt,
      }));
    });
  }
}
