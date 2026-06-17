import { IncomingJob, JobHandler, MetricsRegistry, QueueName, StructuredLogger } from '@marketmind/queue';
import { AccountLike, AccountLookup, ItemSyncRunner, WithTenant } from './ports';
import { itemIdFromResource } from '../observability/catalog-metrics';

export interface ItemSyncJobData {
  accountId?: string;
  itemId?: string;
  resource?: string;
  userId?: number | null;
}

/**
 * Processor genérico de sincronização de um anúncio específico — reutilizado
 * pelas filas de estoque, preço e variação (cada uma com seu use case e métrica).
 */
export function makeItemSyncProcessor(deps: {
  queue: QueueName;
  accounts: AccountLookup;
  runner: ItemSyncRunner;
  withTenant: WithTenant;
  metrics: MetricsRegistry;
  metricName: string;
  logger: StructuredLogger;
}): JobHandler<ItemSyncJobData> {
  return async (job: IncomingJob<ItemSyncJobData>) => {
    const log = deps.logger.child({ queue: deps.queue, jobId: job.id });
    const itemId = job.data.itemId ?? itemIdFromResource(job.data.resource);
    if (!itemId) {
      log.warn('item sync sem itemId', { resource: job.data.resource });
      return;
    }

    let targets: AccountLike[];
    if (job.data.accountId) {
      const acc = await deps.accounts.findById(job.data.accountId);
      targets = acc ? [acc] : [];
    } else if (job.data.userId != null) {
      targets = await deps.accounts.findByExternalUserId(String(job.data.userId));
    } else {
      targets = [];
    }

    if (targets.length === 0) {
      log.warn('item sync sem conta resolvida', { itemId });
      return;
    }

    for (const account of targets) {
      await deps.withTenant(account.companyId, () =>
        deps.runner.execute({ accountId: account.id, itemId }),
      );
      deps.metrics.inc(deps.metricName, { queue: deps.queue });
    }
    log.info('item sincronizado', { itemId, contas: targets.length });
  };
}
