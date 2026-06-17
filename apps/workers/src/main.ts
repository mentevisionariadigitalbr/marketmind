import 'reflect-metadata';
import { QueueName, QUEUES } from '@marketmind/queue';
import { buildContainer } from './bootstrap/container';
import { makeJobLifecycle } from './observability/job-mirror';
import { makeWebhookProcessor } from './processors/webhook-process.processor';
import { makeOrderFetchProcessor } from './processors/order-fetch.processor';
import { makeCatalogSyncProcessor } from './processors/catalog-sync.processor';
import { makeAccountRefreshProcessor } from './processors/account-refresh.processor';
import { startHealthServer } from './health/health-server';
import { setupSchedulers } from './schedulers/schedulers';

// Defaults de desenvolvimento (em produção/docker o ambiente injeta tudo).
process.env.APP_DATABASE_URL ??=
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6380';
process.env.TOKEN_ENCRYPTION_KEY ??= 'dev-token-encryption-key-change-me-please';

async function bootstrap(): Promise<void> {
  // 'all' (default) | 'worker' | 'scheduler' — permite serviços separados.
  const role = process.env.WORKERS_ROLE ?? 'all';
  const runsWorkers = role === 'all' || role === 'worker';
  const runsSchedulers = role === 'all' || role === 'scheduler';

  const c = buildContainer();
  await c.prisma.onModuleInit();

  const dispatcher = c.provider.dispatcher();
  const lc = (queue: QueueName) =>
    makeJobLifecycle({ queue, store: c.store, metrics: c.metrics, logger: c.logger });

  if (runsWorkers) {
    c.provider.registerWorker(
      QUEUES.WEBHOOK_PROCESS,
      makeWebhookProcessor({ dispatcher, logger: c.logger }),
      lc(QUEUES.WEBHOOK_PROCESS),
      { concurrency: 10 },
    );
    c.provider.registerWorker(
      QUEUES.ORDER_FETCH,
      makeOrderFetchProcessor({
        accounts: c.accounts,
        syncOrders: c.syncOrders,
        withTenant: c.withTenant,
        logger: c.logger,
      }),
      lc(QUEUES.ORDER_FETCH),
      { concurrency: 5 },
    );
    c.provider.registerWorker(
      QUEUES.CATALOG_SYNC,
      makeCatalogSyncProcessor({ logger: c.logger }),
      lc(QUEUES.CATALOG_SYNC),
      { concurrency: 5 },
    );
    c.provider.registerWorker(
      QUEUES.ACCOUNT_REFRESH,
      makeAccountRefreshProcessor({
        accounts: c.accounts,
        session: c.session,
        withTenant: c.withTenant,
        logger: c.logger,
      }),
      lc(QUEUES.ACCOUNT_REFRESH),
      { concurrency: 2 },
    );
  }

  await c.provider.start();
  if (runsSchedulers) {
    await setupSchedulers({ provider: c.provider, logger: c.logger });
  }

  const port = Number(process.env.WORKERS_HEALTH_PORT ?? 3334);
  const server = startHealthServer({
    port,
    prisma: c.prisma,
    provider: c.provider,
    metrics: c.metrics,
  });
  c.logger.info('workers iniciados', {
    role,
    healthPort: port,
    queues: runsWorkers ? Object.values(QUEUES) : [],
  });

  const shutdown = async (signal: string): Promise<void> => {
    c.logger.info('encerrando workers...', { signal });
    server.close();
    await c.provider.close();
    await c.prisma.onModuleDestroy();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar workers:', err);
  process.exit(1);
});
