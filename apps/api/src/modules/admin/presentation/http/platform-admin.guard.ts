import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ADMIN_TOKEN_SERVICE, AdminTokenService } from '../../domain/ports/admin-token.service';

/**
 * Guard da FRONTEIRA de admin. Verifica o token com o segredo de admin (separado do
 * de tenant). Sem Bearer → 401; token presente que NÃO seja um token de admin válido
 * (ex.: token de cliente, assinado com outro segredo) → 403. Assim, um usuário comum
 * jamais acessa /admin.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(@Inject(ADMIN_TOKEN_SERVICE) private readonly tokens: AdminTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();

    const header = request.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de admin ausente.');
    }

    try {
      const claims = await this.tokens.verify(header.slice(7));
      // `user` recebe as claims do admin (sem companyId): alimenta a auditoria com o
      // id do admin e mantém o admin FORA do contexto de tenant (RLS aberta).
      request.user = claims;
      return true;
    } catch {
      throw new ForbiddenException('Acesso restrito ao admin da plataforma.');
    }
  }
}
