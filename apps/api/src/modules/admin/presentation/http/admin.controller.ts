import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CurrentAdmin } from './current-admin.decorator';
import { AdminClaims } from '../../domain/admin-claims';
import { GetSaasMetricsUseCase } from '../../application/get-saas-metrics.use-case';

/** Rotas do backoffice — TODAS atrás do PlatformAdminGuard. */
@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private readonly saasMetrics: GetSaasMetricsUseCase) {}

  /** Identidade do admin autenticado (valida a fronteira). */
  @Get('me')
  me(@CurrentAdmin() admin: AdminClaims) {
    return { id: admin.sub, email: admin.email, scope: admin.scope };
  }

  /** Métricas de negócio da plataforma (MRR, ativos, churn, conversão de trial). */
  @Get('metrics')
  metrics() {
    return this.saasMetrics.execute();
  }
}
