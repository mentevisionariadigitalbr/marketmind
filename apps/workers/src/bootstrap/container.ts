import { BullMqQueueProvider, MetricsRegistry, StructuredLogger } from '@marketmind/queue';

import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { AesGcmTokenCipher } from '@marketmind/integration-core';
import { PrismaMarketplaceAccountRepository } from '@marketmind/integration-core';
import { PrismaOrderSyncRepository } from '@marketmind/integration-core';
import { PrismaCatalogSyncRepository } from '@marketmind/integration-core';
import { MercadoLivreOAuthAdapter } from '@marketmind/integration-core';
import { MercadoLivreApiFactoryAdapter } from '@marketmind/integration-core';
import { MercadoLivreSession } from '@marketmind/integration-core';
import { SyncOrdersUseCase } from '@marketmind/integration-core';
import { SyncProductsUseCase } from '@marketmind/integration-core';
import { SyncVariationsUseCase } from '@marketmind/integration-core';
import { SyncInventoryUseCase } from '@marketmind/integration-core';
import { SyncPricesUseCase } from '@marketmind/integration-core';
import { SyncCategoriesUseCase } from '@marketmind/integration-core';

import { JobStore, JobRecord } from '../jobs/job-store';
import {
  AccountLookup,
  CategorySyncRunner,
  ItemSyncRunner,
  ProductSyncRunner,
  SessionRefresher,
  WithTenant,
} from '../processors/ports';

class PrismaJobStore implements JobStore {
  constructor(private readonly prisma: PrismaService) {}
  async save(r: JobRecord): Promise<void> {
    await this.prisma.db.job.upsert({
      where: { queue_jobId: { queue: r.queue, jobId: r.jobId } },
      create: {
        queue: r.queue,
        jobId: r.jobId,
        jobName: r.jobName,
        status: r.status,
        companyId: r.companyId ?? undefined,
        attempts: r.attempts,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        error: r.error,
      },
      update: {
        status: r.status,
        attempts: r.attempts,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        error: r.error,
      },
    });
  }
}

export interface Container {
  logger: StructuredLogger;
  metrics: MetricsRegistry;
  provider: BullMqQueueProvider;
  prisma: PrismaService;
  store: JobStore;
  accounts: AccountLookup;
  syncOrders: { execute: SyncOrdersUseCase['execute'] };
  syncProducts: ProductSyncRunner;
  syncVariations: ItemSyncRunner;
  syncInventory: ItemSyncRunner;
  syncPrices: ItemSyncRunner;
  syncCategories: CategorySyncRunner;
  session: SessionRefresher;
  withTenant: WithTenant;
}

export function buildContainer(): Container {
  const logger = new StructuredLogger({ service: 'workers' });
  const metrics = new MetricsRegistry();

  const prisma = new PrismaService();
  const cipher = new AesGcmTokenCipher(process.env.TOKEN_ENCRYPTION_KEY ?? '');
  const oauth = new MercadoLivreOAuthAdapter({
    clientId: process.env.ML_CLIENT_ID,
    clientSecret: process.env.ML_CLIENT_SECRET,
    redirectUri: process.env.ML_REDIRECT_URI,
  });
  const apiFactory = new MercadoLivreApiFactoryAdapter();
  const accounts = new PrismaMarketplaceAccountRepository(prisma);
  const orderSync = new PrismaOrderSyncRepository(prisma);
  const catalogSync = new PrismaCatalogSyncRepository(prisma);
  const mlSession = new MercadoLivreSession(cipher, oauth, accounts, apiFactory);
  const syncOrders = new SyncOrdersUseCase(accounts, mlSession, orderSync);
  const syncProducts = new SyncProductsUseCase(accounts, mlSession, catalogSync);
  const syncVariations = new SyncVariationsUseCase(accounts, mlSession, catalogSync);
  const syncInventory = new SyncInventoryUseCase(accounts, mlSession, catalogSync);
  const syncPrices = new SyncPricesUseCase(accounts, mlSession, catalogSync);
  const syncCategories = new SyncCategoriesUseCase(accounts, mlSession, catalogSync);

  const provider = new BullMqQueueProvider({
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
    logger,
  });

  // Bridge: o processor lida com AccountLike; a sessão real precisa da conta
  // completa (tokens) — re-busca por id.
  const session: SessionRefresher = {
    apiForAccount: async (a) => {
      const full = await accounts.findById(a.id);
      if (!full) throw new Error(`Conta ${a.id} não encontrada`);
      return mlSession.apiForAccount(full);
    },
  };

  const withTenant: WithTenant = (companyId, fn) =>
    runWithTenant({ companyId, userId: 'worker', role: 'SYSTEM' }, fn);

  return {
    logger,
    metrics,
    provider,
    prisma,
    store: new PrismaJobStore(prisma),
    accounts,
    syncOrders,
    syncProducts,
    syncVariations,
    syncInventory,
    syncPrices,
    syncCategories,
    session,
    withTenant,
  };
}
