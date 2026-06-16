import { Inject, Injectable } from '@nestjs/common';
import {
  WEBHOOK_EVENT_REPOSITORY,
  WebhookEventRepository,
} from '../../domain/ports/webhook-event.repository';

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
}

/**
 * Recebe uma notificação do Mercado Livre e a registra de forma idempotente.
 * Reprocessar a mesma notificação (mesmo `dedupeKey`) não cria duplicidade —
 * a chamada retorna `duplicated: true` e nada é re-enfileirado.
 *
 * O processamento pesado (buscar o recurso e sincronizar) é delegado a um worker
 * BullMQ; aqui apenas garantimos ACK rápido + idempotência (ADR-0003).
 */
@Injectable()
export class HandleMercadoLivreWebhookUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY) private readonly webhooks: WebhookEventRepository,
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

    return { duplicated: !isNew };
  }
}
