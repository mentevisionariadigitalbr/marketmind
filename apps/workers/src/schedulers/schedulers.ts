import { BullMqQueueProvider, QUEUES, StructuredLogger } from '@marketmind/queue';

/**
 * Jobs agendados (repeatable). Refresh de tokens roda periodicamente, bem antes
 * do vencimento (a janela de skew da sessão garante renovação proativa).
 */
export async function setupSchedulers(deps: {
  provider: BullMqQueueProvider;
  logger: StructuredLogger;
}): Promise<void> {
  // Health/token: verifica e renova tokens das contas conectadas.
  const healthCron = process.env.SCHED_HEALTH ?? process.env.SCHED_ACCOUNT_REFRESH ?? '*/30 * * * *';
  // Catalog: full sync (produtos+variações+estoque+preços+imagens) — cobre o
  // refresh agendado de inventário e preço; webhooks tratam o tempo real.
  const catalogCron = process.env.SCHED_CATALOG_SYNC ?? '0 */6 * * *'; // a cada 6h

  await deps.provider.schedule(QUEUES.ACCOUNT_REFRESH, 'scheduled-health', {}, healthCron, {
    jobId: 'sched:health',
  });
  // Kickoff sem accountId => fan-out por conta conectada (full catalog).
  await deps.provider.schedule(QUEUES.CATALOG_SYNC, 'scheduled-catalog', {}, catalogCron, {
    jobId: 'sched:catalog-sync',
  });

  deps.logger.info('schedulers configurados', { health: healthCron, catalogSync: catalogCron });
}
