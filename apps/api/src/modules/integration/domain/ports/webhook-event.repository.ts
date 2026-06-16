export const WEBHOOK_EVENT_REPOSITORY = Symbol('WebhookEventRepository');

export interface RecordWebhookData {
  companyId: string | null;
  source: string;
  topic: string;
  resource: string;
  dedupeKey: string;
  payload: unknown;
}

export interface WebhookEventRepository {
  /**
   * Registra a notificação. Retorna `false` se o `dedupeKey` já existia
   * (duplicada) — garantindo idempotência do webhook.
   */
  recordIfNew(data: RecordWebhookData): Promise<boolean>;
  markProcessed(dedupeKey: string): Promise<void>;
}
