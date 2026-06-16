import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';
import { CurrentUser } from './current-user.decorator';
import { PERMISSIONS } from '../../domain/permissions';
import type { AccessClaims } from '../../domain/ports/token-service.port';

/** Endpoints de administração de IAM, protegidos por permissão (RBAC). */
@Controller('iam')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly listRoles: ListRolesUseCase) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.IAM_READ)
  async roles(@CurrentUser() user: AccessClaims) {
    return this.listRoles.execute({ companyId: user.companyId });
  }
}
