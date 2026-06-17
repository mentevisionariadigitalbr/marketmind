import { Logger } from '@nestjs/common';
import { DispatchOptions, DispatchResult, JobDispatcher, QueueName } from '@marketmind/queue';

/**
 * Dispatcher de fallback quando REDIS_URL não está configurado: não enfileira,
 * apenas registra um aviso. O evento já foi persistido (outbox), então uma
 * reconciliação futura pode reprocessar. Mantém a API bootável sem Redis.
 */
export class NoopJobDispatcher implements JobDispatcher {
  private readonly logger = new Logger(NoopJobDispatcher.name);

  async dispatch<T>(
    queue: QueueName,
    name: string,
    _payload: T,
    opts?: DispatchOptions,
  ): Promise<DispatchResult> {
    this.logger.warn(`REDIS_URL ausente — job "${name}" em ${queue} NÃO enfileirado.`);
    return { id: opts?.jobId ?? 'noop', deduped: false };
  }

  async close(): Promise<void> {
    /* noop */
  }
}
