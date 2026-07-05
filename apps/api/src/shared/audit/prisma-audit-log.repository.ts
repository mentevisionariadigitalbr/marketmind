import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { AuditLogEntry, AuditLogRepository } from './audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.prisma.db.auditLog.create({
      data: {
        companyId: entry.companyId ?? undefined,
        userId: entry.userId ?? undefined,
        action: entry.action,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        ip: entry.ip ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
