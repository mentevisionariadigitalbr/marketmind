import { IncomingJob, JobHandler, QUEUES, StructuredLogger } from '@marketmind/queue';
import { AccountLike, AccountLookup, OrderSyncRunner, WithTenant } from './ports';

export interface OrderFetchJobData {
  userId?: number | null;
  accountId?: string;
  resource?: string;
}

/**
 * Sincroniza pedidos da(s) conta(s) resolvida(s). Roda dentro do contexto de
 * tenant para que o RLS valha. Idempotente (o upsert por external_id garante).
 */
export function makeOrderFetchProcessor(deps: {
  accounts: AccountLookup;
  syncOrders: OrderSyncRunner;
  withTenant: WithTenant;
  logger: StructuredLogger;
}): JobHandler<OrderFetchJobData> {
  return async (job: IncomingJob<OrderFetchJobData>) => {
    const { accountId, userId } = job.data;
    const log = deps.logger.child({ queue: QUEUES.ORDER_FETCH, jobId: job.id });

    let targets: AccountLike[];
    if (accountId) {
      const acc = await deps.accounts.findById(accountId);
      targets = acc ? [acc] : [];
    } else if (userId != null) {
      targets = await deps.accounts.findByExternalUserId(String(userId));
    } else {
      targets = [];
    }

    if (targets.length === 0) {
      log.warn('order.fetch sem conta resolvida', { accountId, userId });
      return;
    }

    for (const account of targets) {
      const result = await deps.withTenant(account.companyId, () =>
        deps.syncOrders.execute({ accountId: account.id }),
      );
      log.info('pedidos sincronizados', {
        accountId: account.id,
        companyId: account.companyId,
        ...result,
      });
    }
  };
}
