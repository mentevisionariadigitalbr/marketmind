import {
  IncomingJob,
  JobDispatcher,
  JobHandler,
  MetricsRegistry,
  QUEUES,
  StructuredLogger,
} from '@marketmind/queue';
import { AccountLookup, ProductSyncRunner, WithTenant } from './ports';
import { CATALOG_METRIC } from '../observability/catalog-metrics';

export interface CatalogSyncJobData {
  accountId?: string;
  offset?: number;
}

/**
 * Sincroniza o catálogo de forma paginada e idempotente. Sem accountId
 * (scheduler), faz fan-out por conta conectada. Com accountId, sincroniza a
 * página e RE-DESPACHA a próxima (`hasMore`) — backpressure / full sync.
 */
export function makeCatalogSyncProcessor(deps: {
  accounts: AccountLookup;
  syncProducts: ProductSyncRunner;
  dispatcher: JobDispatcher;
  withTenant: WithTenant;
  metrics: MetricsRegistry;
  logger: StructuredLogger;
}): JobHandler<CatalogSyncJobData> {
  const labels = { queue: QUEUES.CATALOG_SYNC };

  return async (job: IncomingJob<CatalogSyncJobData>) => {
    const log = deps.logger.child({ queue: QUEUES.CATALOG_SYNC, jobId: job.id });
    const { accountId, offset } = job.data ?? {};

    if (!accountId) {
      const accounts = await deps.accounts.listConnected();
      for (const a of accounts) {
        await deps.dispatcher.dispatch(
          QUEUES.CATALOG_SYNC,
          'page',
          { accountId: a.id, offset: 0 },
          { jobId: `catalog_${a.id}_0` },
        );
      }
      log.info('catalog kickoff (fan-out por conta)', { accounts: accounts.length });
      return;
    }

    const account = await deps.accounts.findById(accountId);
    if (!account) {
      log.warn('catalog.sync conta não encontrada', { accountId });
      return;
    }

    const started = Date.now();
    const result = await deps.withTenant(account.companyId, () =>
      deps.syncProducts.execute({ accountId, offset }),
    );

    deps.metrics.inc(CATALOG_METRIC.PRODUCTS_SYNCED, labels, result.created + result.updated);
    deps.metrics.inc(CATALOG_METRIC.PRICE_UPDATES, labels, result.priceChanges);
    deps.metrics.observe(CATALOG_METRIC.CATALOG_DURATION, Date.now() - started, labels);
    log.info('catalog page sincronizada', { accountId, offset: offset ?? 0, ...result });

    if (result.hasMore) {
      await deps.dispatcher.dispatch(
        QUEUES.CATALOG_SYNC,
        'page',
        { accountId, offset: result.nextOffset },
        { jobId: `catalog_${accountId}_${result.nextOffset}` },
      );
    }
  };
}
