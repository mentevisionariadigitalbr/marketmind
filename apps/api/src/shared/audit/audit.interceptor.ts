import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AUDIT_ACTION_KEY } from './audit-action.decorator';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from './audit-log.repository';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface AuthLikeUser {
  sub?: string;
  companyId?: string;
}

/**
 * Trilha de auditoria: registra, em `audit_logs`, ações que alteram estado
 * (POST/PUT/PATCH/DELETE) e qualquer rota anotada com @AuditAction, capturando
 * ação, usuário, tenant, método, rota, status, IP, user-agent e timestamp.
 *
 * Falha de gravação nunca quebra a requisição (auditoria é best-effort + log).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly audit: AuditLogRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const explicitAction = this.reflector.get<string | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthLikeUser }>();
    const method = req.method;

    if (explicitAction === undefined && !STATE_CHANGING.has(method)) {
      return next.handle();
    }

    const path = req.route?.path ?? req.originalUrl ?? req.url;
    const action = explicitAction ?? `${method} ${path}`;
    const ip = req.ip ?? null;
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;

    return next.handle().pipe(
      tap({
        next: (body) => {
          const res = http.getResponse<{ statusCode?: number }>();
          void this.write(req, body, action, method, path, res.statusCode ?? 200, ip, userAgent);
        },
        error: (err: { status?: number }) => {
          void this.write(req, undefined, action, method, path, err?.status ?? 500, ip, userAgent);
        },
      }),
    );
  }

  private async write(
    req: { user?: AuthLikeUser },
    body: unknown,
    action: string,
    method: string,
    path: string,
    statusCode: number,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    // Ator: claims do token quando autenticado; senão, do corpo da resposta
    // (ex.: login/signup, que não passam por guard mas retornam o usuário).
    const claims = req.user;
    const fromBody =
      body && typeof body === 'object' && 'user' in body
        ? (body as { user?: { id?: string; companyId?: string } }).user
        : undefined;

    try {
      await this.audit.record({
        companyId: claims?.companyId ?? fromBody?.companyId ?? null,
        userId: claims?.sub ?? fromBody?.id ?? null,
        action,
        method,
        path,
        statusCode,
        ip,
        userAgent,
      });
    } catch (err) {
      this.logger.warn(`Falha ao gravar audit log (${action}): ${(err as Error).message}`);
    }
  }
}
