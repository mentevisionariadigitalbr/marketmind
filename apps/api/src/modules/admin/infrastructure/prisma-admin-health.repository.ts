import { Injectable } from '@nestjs/common';
import { MarketplaceAccountStatus } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { AdminHealthRepository, HealthSummary } from '../domain/ports/admin-health.repository';

const PROBLEM_ACCOUNT_STATUS: MarketplaceAccountStatus[] = ['EXPIRED', 'ERROR'];
const FAILED_JOB_STATUS = ['failed', 'dead_letter'];

/** Saúde operacional lida SEM contexto de tenant (admin → RLS aberta). */
@Injectable()
export class PrismaAdminHealthRepository implements AdminHealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthSummary> {
    const [acctGroups, acctTotal, problematic, jobGroups, recentFailures] = await Promise.all([
      this.prisma.db.marketplaceAccount.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.db.marketplaceAccount.count(),
      this.prisma.db.marketplaceAccount.findMany({
        where: { status: { in: PROBLEM_ACCOUNT_STATUS } },
        take: 50,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          companyId: true,
          nickname: true,
          status: true,
          lastSyncedAt: true,
          company: { select: { name: true } },
          marketplace: { select: { code: true } },
        },
      }),
      this.prisma.db.job.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.db.job.findMany({
        where: { status: { in: FAILED_JOB_STATUS } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: { id: true, queue: true, jobName: true, status: true, attempts: true, error: true, createdAt: true },
      }),
    ]);

    const byStatus = (groups: { status: string; _count: { _all: number } }[]): Record<string, number> =>
      Object.fromEntries(groups.map((g) => [g.status, g._count._all]));

    return {
      marketplaceAccounts: {
        total: acctTotal,
        byStatus: byStatus(acctGroups as { status: string; _count: { _all: number } }[]),
        problematic: problematic.map((a) => ({
          id: a.id,
          companyId: a.companyId,
          companyName: a.company.name,
          marketplace: a.marketplace.code,
          nickname: a.nickname,
          status: a.status,
          lastSyncedAt: a.lastSyncedAt ? a.lastSyncedAt.toISOString() : null,
        })),
      },
      jobs: {
        byStatus: byStatus(jobGroups as { status: string; _count: { _all: number } }[]),
        recentFailures: recentFailures.map((j) => ({
          id: j.id,
          queue: j.queue,
          jobName: j.jobName,
          status: j.status,
          attempts: j.attempts,
          error: j.error,
          createdAt: j.createdAt.toISOString(),
        })),
      },
    };
  }
}
