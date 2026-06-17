/** Filas do domínio. Strings estáveis (contrato com o broker). */
export const QUEUES = {
  ORDER_FETCH: 'ml.order.fetch',
  CATALOG_SYNC: 'ml.catalog.sync',
  INVENTORY_SYNC: 'ml.inventory.sync',
  PRICE_SYNC: 'ml.price.sync',
  CATEGORY_SYNC: 'ml.category.sync',
  VARIATION_SYNC: 'ml.variation.sync',
  ACCOUNT_REFRESH: 'ml.account.refresh',
  WEBHOOK_PROCESS: 'ml.webhook.process',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const ALL_QUEUES: QueueName[] = Object.values(QUEUES);

/** Nome da dead-letter queue derivada de uma fila. */
export const dlqName = (queue: string): string => `${queue}.dlq`;

export interface DispatchOptions {
  /** Idempotência: dois dispatches com o mesmo id não criam dois jobs. */
  jobId?: string;
  delayMs?: number;
  /** Override do número de tentativas (default: política padrão). */
  attempts?: number;
}

export interface DispatchResult {
  id: string;
  /** true se o job já existia (deduplicado pela camada de fila). */
  deduped: boolean;
}

/**
 * Porta de despacho (produtor). O domínio depende disto, nunca do BullMQ —
 * permitindo trocar por RabbitMQ/Kafka/SQS/PubSub sem mexer em regra de negócio.
 */
export interface JobDispatcher {
  dispatch<T>(
    queue: QueueName,
    jobName: string,
    payload: T,
    opts?: DispatchOptions,
  ): Promise<DispatchResult>;
  close(): Promise<void>;
}

export interface IncomingJob<T = unknown> {
  id: string;
  name: string;
  queue: string;
  data: T;
  /** Tentativas já realizadas (inclui a atual). */
  attemptsMade: number;
  maxAttempts: number;
}

export type JobHandler<T = unknown> = (job: IncomingJob<T>) => Promise<void>;

/** Hooks de ciclo de vida — usados pelo app worker para mirror em `jobs` + métricas. */
export interface JobLifecycle {
  onActive?(job: IncomingJob): void | Promise<void>;
  onCompleted?(job: IncomingJob, durationMs: number): void | Promise<void>;
  onFailed?(job: IncomingJob, error: Error, willRetry: boolean): void | Promise<void>;
  onDeadLetter?(job: IncomingJob, error: Error): void | Promise<void>;
}

export interface WorkerOptions {
  concurrency?: number;
}

/**
 * Porta de infraestrutura de filas (consumidor + scheduler). Implementada pelo
 * adapter BullMQ (runtime) e por um adapter em memória (testes).
 */
export interface QueueProvider {
  registerWorker<T>(
    queue: QueueName,
    handler: JobHandler<T>,
    lifecycle?: JobLifecycle,
    opts?: WorkerOptions,
  ): void;
  dispatcher(): JobDispatcher;
  schedule<T>(
    queue: QueueName,
    jobName: string,
    payload: T,
    cron: string,
    opts?: DispatchOptions,
  ): Promise<void>;
  start(): Promise<void>;
  close(): Promise<void>;
}
