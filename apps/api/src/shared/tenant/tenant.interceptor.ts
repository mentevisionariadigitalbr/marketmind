import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithTenant } from '@marketmind/kernel';
import type { AccessClaims } from '../../modules/iam/domain/ports/token-service.port';

/**
 * Após o guard autenticar, propaga o contexto de tenant (company/user/role) via
 * AsyncLocalStorage por toda a cadeia de execução. Base para o RLS e para queries
 * tenant-scoped sem precisar passar o companyId manualmente.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AccessClaims }>();
    const user = request.user;
    if (!user) {
      return next.handle();
    }
    return new Observable((subscriber) => {
      runWithTenant({ companyId: user.companyId, userId: user.sub, role: user.role }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
