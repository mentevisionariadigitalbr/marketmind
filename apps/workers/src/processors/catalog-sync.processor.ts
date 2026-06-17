import { IncomingJob, JobHandler, QUEUES, StructuredLogger } from '@marketmind/queue';

export interface CatalogSyncJobData {
  userId?: number | null;
  resource?: string;
}

/**
 * Sincronização de catálogo (produtos/categorias/estoque/variações). A infra de
 * fila + idempotência já está pronta; o use case de catálogo entra numa próxima
 * fatia — por ora o processor é um stub observável (não falha o job).
 */
export function makeCatalogSyncProcessor(deps: {
  logger: StructuredLogger;
}): JobHandler<CatalogSyncJobData> {
  return async (job: IncomingJob<CatalogSyncJobData>) => {
    deps.logger
      .child({ queue: QUEUES.CATALOG_SYNC, jobId: job.id })
      .info('catalog.sync recebido (stub — use case de catálogo na próxima fatia)', {
        resource: job.data?.resource,
      });
  };
}
