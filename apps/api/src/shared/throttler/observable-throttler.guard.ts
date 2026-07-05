import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * ThrottlerGuard com observabilidade (Sprint 4.0): registra um log estruturado
 * sempre que um request é bloqueado (429), facilitando alertas e diagnóstico.
 * Toda a lógica de limite permanece no ThrottlerGuard padrão.
 */
@Injectable()
export class ObservableThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger('RateLimit');

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    this.logger.warn(
      `429 ${req.method} ${req.url} tracker=${detail.tracker} hits=${detail.totalHits}/${detail.limit}`,
    );
    return super.throwThrottlingException(context, detail);
  }
}
