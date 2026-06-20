import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { InviteMemberUseCase } from '../../application/use-cases/invite-member.use-case';
import { AssignRoleUseCase } from '../../application/use-cases/assign-role.use-case';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';
import { CurrentUser } from './current-user.decorator';
import { PERMISSIONS } from '../../domain/permissions';
import type { AccessClaims } from '../../domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { InviteMemberDto, AssignRoleDto } from './dto/team.dto';

/** Endpoints de administração de IAM (papéis e membros), protegidos por permissão. */
@ApiTags('IAM')
@ApiBearerAuth()
@Controller('iam')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly inviteMember: InviteMemberUseCase,
    private readonly assignRole: AssignRoleUseCase,
    private readonly config: ConfigService,
  ) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.IAM_READ)
  roles(@CurrentUser() user: AccessClaims) {
    return this.listRoles.execute({ companyId: user.companyId });
  }

  @Get('users')
  @RequirePermissions(PERMISSIONS.IAM_READ)
  users(@CurrentUser() user: AccessClaims) {
    return this.listUsers.execute({ companyId: user.companyId });
  }

  @Post('invites')
  @RequirePermissions(PERMISSIONS.IAM_WRITE)
  @AuditAction('iam.member.invite')
  async invite(@CurrentUser() user: AccessClaims, @Body() dto: InviteMemberDto) {
    const result = await this.inviteMember.execute({
      companyId: user.companyId,
      email: dto.email,
      name: dto.name,
      role: dto.role,
    });
    return { email: result.email, inviteUrl: `${this.webBaseUrl()}/accept-invite?token=${result.token}` };
  }

  @Put('users/:id/role')
  @RequirePermissions(PERMISSIONS.IAM_WRITE)
  @AuditAction('iam.member.assign_role')
  async setRole(@CurrentUser() user: AccessClaims, @Param('id') id: string, @Body() dto: AssignRoleDto) {
    await this.assignRole.execute({ companyId: user.companyId, userId: id, role: dto.role });
    return { ok: true };
  }

  private webBaseUrl(): string {
    const origin = this.config.get<string>('CORS_ORIGIN')?.split(',')[0] ?? 'http://localhost:3000';
    return origin.replace(/\/$/, '');
  }
}
