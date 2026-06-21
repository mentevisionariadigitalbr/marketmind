import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  BillingUsageRepository,
  UsageCounts,
} from '../../domain/ports/billing-usage.repository';

/** Contagens de uso do tenant corrente (RLS via runInTransaction + filtro). */
@Injectable()
export class PrismaBillingUsageRepository implements BillingUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async countForCurrentCompany(): Promise<UsageCounts> {
    return this.prisma.runInTransaction(async () => {
      const companyId = this.companyId;
      const [marketplaceAccounts, products] = await Promise.all([
        this.prisma.db.marketplaceAccount.count({ where: { companyId } }),
        this.prisma.db.product.count({ where: { companyId } }),
      ]);
      return { marketplaceAccounts, products };
    });
  }

  async companyCreatedAt(): Promise<Date | null> {
    return this.prisma.runInTransaction(async () => {
      const company = await this.prisma.db.company.findFirst({
        where: { id: this.companyId },
        select: { createdAt: true },
      });
      return company?.createdAt ?? null;
    });
  }
}
