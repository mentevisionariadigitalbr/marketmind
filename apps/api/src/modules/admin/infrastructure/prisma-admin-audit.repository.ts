import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { AdminAuditRepository, AuditLogPage } from '../domain/ports/admin-audit.repository';

/** Trilha de auditoria lida SEM contexto de tenant (admin → RLS aberta). */
@Injectable()
export class PrismaAdminAuditRepository implements AdminAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page: number; pageSize: number; action?: string }): Promise<AuditLogPage> {
    const page = Math.max(1, Math.floor(params.page) || 1);
    const pageSize = Math.min(Math.max(Math.floor(params.pageSize) || 50, 1), 100);
    const where: Prisma.AuditLogWhereInput = params.action
      ? { action: { contains: params.action, mode: 'insensitive' } }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          action: true,
          method: true,
          path: true,
          statusCode: true,
          userId: true,
          companyId: true,
          ip: true,
        },
      }),
      this.prisma.db.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        method: r.method,
        path: r.path,
        statusCode: r.statusCode,
        userId: r.userId,
        companyId: r.companyId,
        ip: r.ip,
      })),
      total,
      page,
      pageSize,
    };
  }
}
