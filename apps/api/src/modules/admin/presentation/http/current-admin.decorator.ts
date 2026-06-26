import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminClaims } from '../../domain/admin-claims';

/** Injeta as claims do admin autenticado (definidas pelo PlatformAdminGuard). */
export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminClaims => {
  return ctx.switchToHttp().getRequest<{ user: AdminClaims }>().user;
});
