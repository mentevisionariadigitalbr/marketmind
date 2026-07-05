import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import {
  DataSubjectScope,
  DataSubjectType,
  PrivacyRepository,
  UserDataExport,
} from '../../domain/ports/privacy.repository';

const AUDIT_EXPORT_LIMIT = 1000;

/** Anonimização aplicada a um usuário excluído (e-mail tombstone único por id). */
function anonymizedUser(userId: string) {
  return {
    name: 'Conta excluída',
    email: `deleted+${userId}@removed.invalid`,
    passwordHash: null,
    googleId: null,
    status: 'DISABLED' as const,
    emailVerifiedAt: null,
  };
}

@Injectable()
export class PrismaPrivacyRepository implements PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exportUserData(userId: string, companyId: string): Promise<UserDataExport> {
    return this.prisma.runInTransaction(async () => {
      const [user, company, sessions, audit] = await Promise.all([
        this.prisma.db.user.findFirst({ where: { id: userId, companyId } }),
        this.prisma.db.company.findFirst({ where: { id: companyId } }),
        this.prisma.db.refreshToken.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.db.auditLog.findMany({
          where: { userId, companyId },
          orderBy: { createdAt: 'desc' },
          take: AUDIT_EXPORT_LIMIT,
        }),
      ]);

      return {
        profile: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
              emailVerified: user.emailVerifiedAt !== null,
              createdAt: user.createdAt.toISOString(),
            }
          : null,
        company: company
          ? {
              id: company.id,
              name: company.name,
              taxId: company.taxId,
              taxRegime: company.taxRegime,
              createdAt: company.createdAt.toISOString(),
            }
          : null,
        sessions: sessions.map((s) => ({
          createdAt: s.createdAt.toISOString(),
          ip: s.ip,
          userAgent: s.userAgent,
          revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
          expiresAt: s.expiresAt.toISOString(),
        })),
        auditLog: audit.map((a) => ({
          action: a.action,
          method: a.method,
          path: a.path,
          statusCode: a.statusCode,
          ip: a.ip,
          userAgent: a.userAgent,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    });
  }

  async recordRequest(data: {
    userId: string;
    companyId: string;
    type: DataSubjectType;
    scope: DataSubjectScope;
  }): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      await this.prisma.db.dataSubjectRequest.create({
        data: { userId: data.userId, companyId: data.companyId, type: data.type, scope: data.scope },
      });
    });
  }

  async deleteAccount(data: {
    requesterUserId: string;
    companyId: string;
    scope: DataSubjectScope;
  }): Promise<void> {
    await this.prisma.runInTransaction(async () => {
      // 1. Prova do pedido (retida).
      await this.prisma.db.dataSubjectRequest.create({
        data: { userId: data.requesterUserId, companyId: data.companyId, type: 'DELETION', scope: data.scope },
      });

      // 2. Define os usuários afetados.
      const userIds =
        data.scope === 'COMPANY'
          ? (await this.prisma.db.user.findMany({ where: { companyId: data.companyId }, select: { id: true } })).map(
              (u) => u.id,
            )
          : [data.requesterUserId];

      // 3. Revoga sessões e remove tokens de uso único dos usuários afetados.
      await this.prisma.db.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await this.prisma.db.userToken.deleteMany({ where: { userId: { in: userIds } } });

      // 4. Anonimiza cada usuário (e-mail tombstone único por id).
      for (const id of userIds) {
        await this.prisma.db.user.updateMany({ where: { id }, data: anonymizedUser(id) });
      }

      // 5. Exclusão de empresa (OWNER): purga dados de negócio e anonimiza a empresa.
      //    Faturas/assinaturas (fiscal) e aceites (consentimento) são RETIDOS.
      if (data.scope === 'COMPANY') {
        // Apagar as contas de marketplace cascateia produtos e pedidos (e filhos).
        await this.prisma.db.marketplaceAccount.deleteMany({ where: { companyId: data.companyId } });
        await this.prisma.db.customer.deleteMany({ where: { companyId: data.companyId } });
        await this.prisma.db.expense.deleteMany({ where: { companyId: data.companyId } });
        await this.prisma.db.taxRule.deleteMany({ where: { companyId: data.companyId } });
        await this.prisma.db.usageRecord.deleteMany({ where: { companyId: data.companyId } });
        await this.prisma.db.company.updateMany({
          where: { id: data.companyId },
          data: { name: 'Conta excluída', taxId: null },
        });
      }
    });
  }
}
