import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_HEALTH_REPOSITORY, AdminHealthRepository, HealthSummary } from '../domain/ports/admin-health.repository';
import { ADMIN_AUDIT_REPOSITORY, AdminAuditRepository, AuditLogPage } from '../domain/ports/admin-audit.repository';

@Injectable()
export class GetHealthUseCase {
  constructor(@Inject(ADMIN_HEALTH_REPOSITORY) private readonly repo: AdminHealthRepository) {}
  execute(): Promise<HealthSummary> {
    return this.repo.getHealth();
  }
}

@Injectable()
export class ListAuditUseCase {
  constructor(@Inject(ADMIN_AUDIT_REPOSITORY) private readonly repo: AdminAuditRepository) {}
  execute(params: { page: number; pageSize: number; action?: string }): Promise<AuditLogPage> {
    return this.repo.list(params);
  }
}
