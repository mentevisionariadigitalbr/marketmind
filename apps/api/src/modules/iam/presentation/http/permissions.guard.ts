import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { AccessClaims } from '../../domain/ports/token-service.port';

/**
 * Autorização baseada em permissões. Lê as permissões exigidas (definidas por
 * @RequirePermissions) e as compara com as permissões do usuário autenticado —
 * que vêm nos claims do access token (sem custo de banco por requisição).
 *
 * Deve rodar depois do JwtAuthGuard, que popula `request.user`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AccessClaims }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Autenticação necessária.');
    }

    const granted = new Set(user.permissions ?? []);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Permissão insuficiente: ${missing.join(', ')}`);
    }
    return true;
  }
}
