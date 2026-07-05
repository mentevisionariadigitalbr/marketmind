import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Impersonação é SOMENTE LEITURA (Fase 7): quando o token do cliente carrega
 * `readOnly`, qualquer método que altera estado é bloqueado (403). Roda como
 * interceptor global — APÓS os guards (req.user já definido), cobrindo todas as
 * rotas de tenant. Tokens normais (sem readOnly) não são afetados.
 */
@Injectable()
export class ImpersonationReadOnlyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<{ method: string; user?: { readOnly?: boolean } }>();
    if (req.user?.readOnly && STATE_CHANGING.has(req.method)) {
      throw new ForbiddenException('Sessão de impersonação é somente leitura.');
    }
    return next.handle();
  }
}
