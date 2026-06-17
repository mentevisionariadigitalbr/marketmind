import { IncomingJob, JobHandler, MetricsRegistry, QUEUES, StructuredLogger } from '@marketmind/queue';
import { AccountLookup, CategorySyncRunner, WithTenant } from './ports';
import { CATALOG_METRIC } from '../observability/catalog-metrics';

export interface CategorySyncJobData {
  accountId?: string;
  categoryId?: string;
}

/** Sincroniza uma categoria + árvore. Usa a primeira conta conectada se não informada. */
export function makeCategorySyncProcessor(deps: {
  accounts: AccountLookup;
  runner: CategorySyncRunner;
  withTenant: WithTenant;
  metrics: MetricsRegistry;
  logger: StructuredLogger;
}): JobHandler<CategorySyncJobData> {
  return async (job: IncomingJob<CategorySyncJobData>) => {
    const log = deps.logger.child({ queue: QUEUES.CATEGORY_SYNC, jobId: job.id });
    const { accountId, categoryId } = job.data ?? {};
    if (!categoryId) {
      log.warn('category sync sem categoryId');
      return;
    }

    const account = accountId
      ? await deps.accounts.findById(accountId)
      : (await deps.accounts.listConnected())[0] ?? null;
    if (!account) {
      log.warn('category sync sem conta', { categoryId });
      return;
    }

    const started = Date.now();
    await deps.withTenant(account.companyId, () =>
      deps.runner.execute({ accountId: account.id, categoryId }),
    );
    deps.metrics.observe(CATALOG_METRIC.CATEGORY_DURATION, Date.now() - started, {
      queue: QUEUES.CATEGORY_SYNC,
    });
    log.info('categoria sincronizada', { categoryId });
  };
}
