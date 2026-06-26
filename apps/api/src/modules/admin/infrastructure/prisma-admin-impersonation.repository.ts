import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import {
  AdminImpersonationRepository,
  ImpersonationTarget,
} from '../domain/ports/admin-impersonation.repository';

/** Resolve o usuário-alvo SEM contexto de tenant (admin → RLS aberta). */
@Injectable()
export class PrismaAdminImpersonationRepository implements AdminImpersonationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCompanyOwner(companyId: string): Promise<ImpersonationTarget | null> {
    const owner =
      (await this.prisma.db.user.findFirst({
        where: { companyId, role: 'OWNER', status: 'ACTIVE' },
        select: { id: true, email: true, company: { select: { name: true } } },
      })) ??
      (await this.prisma.db.user.findFirst({
        where: { companyId, status: 'ACTIVE' },
        select: { id: true, email: true, company: { select: { name: true } } },
      }));
    return owner ? { userId: owner.id, email: owner.email, companyName: owner.company.name } : null;
  }
}
