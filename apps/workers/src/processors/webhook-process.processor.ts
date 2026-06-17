import { IncomingJob, JobDispatcher, JobHandler, QUEUES, StructuredLogger } from '@marketmind/queue';

export interface WebhookJobData {
  dedupeKey: string;
  topic: string;
  resource: string;
  userId: number | null;
}

/**
 * Resolve a notificação recebida e despacha o job adequado (fan-out):
 * pedidos -> ml.order.fetch; itens -> ml.catalog.sync. Idempotente por jobId.
 */
export function makeWebhookProcessor(deps: {
  dispatcher: JobDispatcher;
  logger: StructuredLogger;
}): JobHandler<WebhookJobData> {
  return async (job: IncomingJob<WebhookJobData>) => {
    const { topic, resource, userId } = job.data;
    const log = deps.logger.child({ queue: QUEUES.WEBHOOK_PROCESS, jobId: job.id, topic });
    const payload = { userId, resource };

    // Mapeia o tópico do ML para a fila adequada (fan-out).
    const target = resolveQueue(topic);
    if (!target) {
      log.info('webhook topic ignorado', { resource });
      return;
    }
    await deps.dispatcher.dispatch(target, 'process', payload, { jobId: `${target}:${resource}` });
    log.info(`webhook -> ${target}`, { resource });
  };
}

/** Roteia tópicos de webhook do Mercado Livre para a fila correta. */
function resolveQueue(topic: string): (typeof QUEUES)[keyof typeof QUEUES] | null {
  if (topic.startsWith('orders')) return QUEUES.ORDER_FETCH;
  if (topic.startsWith('price')) return QUEUES.PRICE_SYNC;
  if (topic.startsWith('stock') || topic.startsWith('inventory')) return QUEUES.INVENTORY_SYNC;
  if (topic.startsWith('categor')) return QUEUES.CATEGORY_SYNC;
  // produto / publicação / pausa / exclusão chegam como "items".
  if (topic.startsWith('items')) return QUEUES.VARIATION_SYNC;
  return null;
}
