import { Inject, Injectable } from '@nestjs/common';
import { RBAC_REPOSITORY, RbacRepository, RoleSummary } from '../../domain/ports/rbac.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository) {}

  execute(input: { companyId: string }): Promise<RoleSummary[]> {
    return this.rbac.listRoles(input.companyId);
  }
}
