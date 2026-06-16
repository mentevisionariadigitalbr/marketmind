import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AUDIT_LOG_REPOSITORY } from './audit-log.repository';
import { PrismaAuditLogRepository } from './prisma-audit-log.repository';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  providers: [
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
