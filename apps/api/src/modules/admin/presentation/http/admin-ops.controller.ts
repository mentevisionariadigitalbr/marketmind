import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { GetHealthUseCase, ListAuditUseCase } from '../../application/admin-ops.use-cases';

/** Saúde operacional + auditoria do backoffice (somente leitura, cross-tenant). */
@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class AdminOpsController {
  constructor(
    private readonly health: GetHealthUseCase,
    private readonly audit: ListAuditUseCase,
  ) {}

  @Get('health')
  getHealth() {
    return this.health.execute();
  }

  @Get('audit')
  listAudit(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
  ) {
    return this.audit.execute({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      action: action || undefined,
    });
  }
}
