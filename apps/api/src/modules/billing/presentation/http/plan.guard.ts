import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { EntitlementsService } from '../../application/entitlements.service';
import { SubscriptionRequiredError } from '../../domain/errors';

/**
 * Paywall: bloqueia features pagas quando o acesso está suspenso (trial expirado
 * ou inadimplência). Use APÓS o JwtAuthGuard (precisa de request.user). Resolve o
 * estado pelo companyId do token — não depende do contexto de tenant (ALS), que só
 * é estabelecido depois, no TenantInterceptor.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly entitlements: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AccessClaims }>();
    const user = request.user;
    if (!user) return true; // sem usuário: rota pública — outros guards decidem
    if (await this.entitlements.isBlockedFor(user.companyId)) {
      throw new SubscriptionRequiredError();
    }
    return true;
  }
}
