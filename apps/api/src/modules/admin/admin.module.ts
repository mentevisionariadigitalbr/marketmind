import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '../iam/iam.module';
import { AUDIT_LOG_REPOSITORY } from '../../shared/audit/audit-log.repository';
import { PrismaAuditLogRepository } from '../../shared/audit/prisma-audit-log.repository';
import { AdminAuthController } from './presentation/http/admin-auth.controller';
import { AdminController } from './presentation/http/admin.controller';
import { AdminCompaniesController } from './presentation/http/admin-companies.controller';
import { AdminPlansController } from './presentation/http/admin-plans.controller';
import { AdminOpsController } from './presentation/http/admin-ops.controller';
import { PlatformAdminGuard } from './presentation/http/platform-admin.guard';
import { AdminLoginUseCase } from './application/admin-login.use-case';
import { GetSaasMetricsUseCase } from './application/get-saas-metrics.use-case';
import { ListCompaniesUseCase, GetCompanyDetailUseCase } from './application/admin-companies.use-cases';
import {
  ListPlansUseCase,
  GetPlanUseCase,
  CreatePlanUseCase,
  UpdatePlanUseCase,
} from './application/admin-plans.use-cases';
import { GetHealthUseCase, ListAuditUseCase } from './application/admin-ops.use-cases';
import { ImpersonateCompanyUseCase } from './application/impersonate-company.use-case';
import { ADMIN_TOKEN_SERVICE } from './domain/ports/admin-token.service';
import { ADMIN_IMPERSONATION_REPOSITORY } from './domain/ports/admin-impersonation.repository';
import { PLATFORM_ADMIN_REPOSITORY } from './domain/ports/platform-admin.repository';
import { ADMIN_METRICS_REPOSITORY } from './domain/ports/admin-metrics.repository';
import { ADMIN_COMPANIES_REPOSITORY } from './domain/ports/admin-companies.repository';
import { ADMIN_PLANS_REPOSITORY } from './domain/ports/admin-plans.repository';
import { ADMIN_HEALTH_REPOSITORY } from './domain/ports/admin-health.repository';
import { ADMIN_AUDIT_REPOSITORY } from './domain/ports/admin-audit.repository';
import { JwtAdminTokenService } from './infrastructure/jwt-admin-token.service';
import { PrismaPlatformAdminRepository } from './infrastructure/prisma-platform-admin.repository';
import { PrismaAdminMetricsRepository } from './infrastructure/prisma-admin-metrics.repository';
import { PrismaAdminCompaniesRepository } from './infrastructure/prisma-admin-companies.repository';
import { PrismaAdminPlansRepository } from './infrastructure/prisma-admin-plans.repository';
import { PrismaAdminHealthRepository } from './infrastructure/prisma-admin-health.repository';
import { PrismaAdminAuditRepository } from './infrastructure/prisma-admin-audit.repository';
import { PrismaAdminImpersonationRepository } from './infrastructure/prisma-admin-impersonation.repository';
import { PASSWORD_HASHER } from '../iam/domain/ports/password-hasher.port';
import { Argon2PasswordHasher } from '../iam/infrastructure/security/argon2-password-hasher';

/**
 * Área de admin da PLATAFORMA (Fase 7). Fronteira de segurança SEPARADA do RBAC de
 * tenant: identidade própria (platform_admins) e JWT com segredo próprio. Reutiliza
 * apenas o hashing Argon2 (sem acoplar ao IamModule).
 */
@Module({
  imports: [JwtModule.register({}), IamModule],
  controllers: [
    AdminAuthController,
    AdminController,
    AdminCompaniesController,
    AdminPlansController,
    AdminOpsController,
  ],
  providers: [
    AdminLoginUseCase,
    GetSaasMetricsUseCase,
    ListCompaniesUseCase,
    GetCompanyDetailUseCase,
    ListPlansUseCase,
    GetPlanUseCase,
    CreatePlanUseCase,
    UpdatePlanUseCase,
    GetHealthUseCase,
    ListAuditUseCase,
    ImpersonateCompanyUseCase,
    PlatformAdminGuard,
    { provide: ADMIN_TOKEN_SERVICE, useClass: JwtAdminTokenService },
    { provide: ADMIN_IMPERSONATION_REPOSITORY, useClass: PrismaAdminImpersonationRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
    { provide: PLATFORM_ADMIN_REPOSITORY, useClass: PrismaPlatformAdminRepository },
    { provide: ADMIN_METRICS_REPOSITORY, useClass: PrismaAdminMetricsRepository },
    { provide: ADMIN_COMPANIES_REPOSITORY, useClass: PrismaAdminCompaniesRepository },
    { provide: ADMIN_PLANS_REPOSITORY, useClass: PrismaAdminPlansRepository },
    { provide: ADMIN_HEALTH_REPOSITORY, useClass: PrismaAdminHealthRepository },
    { provide: ADMIN_AUDIT_REPOSITORY, useClass: PrismaAdminAuditRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
  exports: [ADMIN_TOKEN_SERVICE, PlatformAdminGuard],
})
export class AdminModule {}
