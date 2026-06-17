import { IncomingJob, JobHandler, QUEUES, StructuredLogger } from '@marketmind/queue';
import { AccountLookup, SessionRefresher, WithTenant } from './ports';

export interface AccountRefreshJobData {
  accountId?: string;
}

/**
 * Renova tokens e faz health check das contas. `apiForAccount` renova
 * automaticamente quando o token está perto de expirar. Sem accountId, varre
 * todas as contas conectadas (scheduler).
 */
export function makeAccountRefreshProcessor(deps: {
  accounts: AccountLookup;
  session: SessionRefresher;
  withTenant: WithTenant;
  logger: StructuredLogger;
}): JobHandler<AccountRefreshJobData> {
  return async (job: IncomingJob<AccountRefreshJobData>) => {
    const log = deps.logger.child({ queue: QUEUES.ACCOUNT_REFRESH, jobId: job.id });

    const targets = job.data?.accountId
      ? [await deps.accounts.findById(job.data.accountId)].filter((a): a is NonNullable<typeof a> => a !== null)
      : await deps.accounts.listConnected();

    let refreshed = 0;
    for (const account of targets) {
      await deps.withTenant(account.companyId, () => deps.session.apiForAccount(account));
      refreshed += 1;
    }
    log.info('contas verificadas/renovadas', { count: refreshed });
  };
}
