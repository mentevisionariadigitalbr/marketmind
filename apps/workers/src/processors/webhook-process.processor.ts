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

    if (topic.startsWith('orders')) {
      await deps.dispatcher.dispatch(
        QUEUES.ORDER_FETCH,
        'fetch',
        { userId, resource },
        { jobId: `fetch:${resource}` },
      );
      log.info('webhook -> ml.order.fetch', { resource });
    } else if (topic.startsWith('items')) {
      await deps.dispatcher.dispatch(
        QUEUES.CATALOG_SYNC,
        'sync',
        { userId, resource },
        { jobId: `catalog:${resource}` },
      );
      log.info('webhook -> ml.catalog.sync', { resource });
    } else {
      log.info('webhook topic ignorado', { resource });
    }
  };
}
