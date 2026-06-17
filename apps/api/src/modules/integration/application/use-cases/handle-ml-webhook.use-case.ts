import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobDispatcher, QUEUES } from '@marketmind/queue';
import {
  WEBHOOK_EVENT_REPOSITORY,
  WebhookEventRepository,
} from '../../domain/ports/webhook-event.repository';
import { JOB_DISPATCHER } from '../../../../shared/queue/queue.tokens';

export interface MlWebhookNotification {
  _id?: string;
  resource: string;
  topic: string;
  user_id?: number;
  application_id?: number;
  sent?: string;
  attempts?: number;
}

export interface HandleWebhookResult {
  duplicated: boolean;
  enqueued: boolean;
}

/**
 * Recebe uma notificação do Mercado Livre. Padrão Outbox + Event-Driven:
 *  1. Persiste o evento de forma idempotente (dedupeKey único) — sobrevive a
 *     falhas de Redis (reconciliação futura).
 *  2. Enfileira `ml.webhook.process` (best-effort) para processamento assíncrono.
 * A API responde imediatamente; nenhum sync ocorre aqui (ADR-0003).
 */
@Injectable()
export class HandleMercadoLivreWebhookUseCase {
  private readonly logger = new Logger(HandleMercadoLivreWebhookUseCase.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY) private readonly webhooks: WebhookEventRepository,
    @Inject(JOB_DISPATCHER) private readonly dispatcher: JobDispatcher,
  ) {}

  async execute(notification: MlWebhookNotification): Promise<HandleWebhookResult> {
    const dedupeKey =
      notification._id ??
      `ml:${notification.topic}:${notification.resource}:${notification.sent ?? ''}`;

    const isNew = await this.webhooks.recordIfNew({
      companyId: null,
      source: 'mercado_livre',
      topic: notification.topic,
      resource: notification.resource,
      dedupeKey,
      payload: notification,
    });

    if (!isNew) {
      return { duplicated: true, enqueued: false };
    }

    let enqueued = false;
    try {
      await this.dispatcher.dispatch(
        QUEUES.WEBHOOK_PROCESS,
        'process',
        {
          dedupeKey,
          topic: notification.topic,
          resource: notification.resource,
          userId: notification.user_id ?? null,
        },
        { jobId: dedupeKey }, // idempotência também na fila
      );
      enqueued = true;
    } catch (err) {
      // Evento já persistido (outbox) — não falha o ACK; reconciliação reprocessa.
      this.logger.warn(`Falha ao enfileirar webhook (${dedupeKey}): ${(err as Error).message}`);
    }

    return { duplicated: false, enqueued };
  }
}
