import { BullMqQueueProvider, QUEUES, StructuredLogger } from '@marketmind/queue';

/**
 * Jobs agendados (repeatable). Refresh de tokens roda periodicamente, bem antes
 * do vencimento (a janela de skew da sessão garante renovação proativa).
 */
export async function setupSchedulers(deps: {
  provider: BullMqQueueProvider;
  logger: StructuredLogger;
}): Promise<void> {
  const accountRefreshCron = process.env.SCHED_ACCOUNT_REFRESH ?? '*/30 * * * *'; // a cada 30 min

  await deps.provider.schedule(
    QUEUES.ACCOUNT_REFRESH,
    'scheduled-refresh',
    {},
    accountRefreshCron,
    { jobId: 'sched:account-refresh' },
  );

  deps.logger.info('schedulers configurados', { accountRefresh: accountRefreshCron });
}
