import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Exige que o usuário autenticado possua TODAS as permissões informadas.
 * Use junto do JwtAuthGuard: `@UseGuards(JwtAuthGuard, PermissionsGuard)`.
 *
 *   @RequirePermissions('iam:read')
 *   @Get('roles') ...
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
