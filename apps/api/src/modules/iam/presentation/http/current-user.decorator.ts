import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessClaims } from '../../domain/ports/token-service.port';

/** Injeta os claims do usuário autenticado (preenchidos pelo JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessClaims => {
    const request = ctx.switchToHttp().getRequest<{ user: AccessClaims }>();
    return request.user;
  },
);
