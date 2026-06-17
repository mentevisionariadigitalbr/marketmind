import { Queue, Worker, Job, JobsOptions, RedisOptions } from 'bullmq';
import {
  DispatchOptions,
  DispatchResult,
  IncomingJob,
  JobDispatcher,
  JobHandler,
  JobLifecycle,
  QueueName,
  QueueProvider,
  WorkerOptions,
  dlqName,
} from '../ports';
import { MAX_ATTEMPTS, backoffForAttempt } from '../retry';
import { StructuredLogger } from '../logger';

export interface BullMqOptions {
  redisUrl: string;
  logger?: StructuredLogger;
  defaultConcurrency?: number;
}

const toIncoming = (job: Job): IncomingJob => ({
  id: String(job.id),
  name: job.name,
  queue: job.queueName,
  data: job.data,
  attemptsMade: job.attemptsMade + 1,
  maxAttempts: job.opts.attempts ?? MAX_ATTEMPTS,
});

/** Adapter BullMQ da porta QueueProvider (runtime). Retry/backoff/DLQ embutidos. */
export class BullMqQueueProvider implements QueueProvider {
  private readonly connection: RedisOptions;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];
  private readonly logger?: StructuredLogger;
  private readonly defaultConcurrency: number;
  private dispatcherInstance?: JobDispatcher;

  constructor(opts: BullMqOptions) {
    const url = new URL(opts.redisUrl);
    this.connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) || 0 : 0,
      maxRetriesPerRequest: null,
    };
    this.logger = opts.logger;
    this.defaultConcurrency = opts.defaultConcurrency ?? 5;
  }

  private queue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  registerWorker<T>(
    queue: QueueName,
    handler: JobHandler<T>,
    lifecycle?: JobLifecycle,
    opts?: WorkerOptions,
  ): void {
    const worker = new Worker(
      queue,
      async (job: Job) => {
        await (handler as JobHandler)(toIncoming(job));
      },
      {
        connection: this.connection,
        concurrency: opts?.concurrency ?? this.defaultConcurrency,
        settings: { backoffStrategy: (attemptsMade: number) => backoffForAttempt(attemptsMade) },
      },
    );

    worker.on('active', (job) => {
      void lifecycle?.onActive?.(toIncoming(job));
    });
    worker.on('completed', (job) => {
      const duration =
        job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0;
      void lifecycle?.onCompleted?.(toIncoming(job), duration);
    });
    worker.on('failed', (job, err) => {
      if (!job) return;
      const maxAttempts = job.opts.attempts ?? MAX_ATTEMPTS;
      const final = job.attemptsMade >= maxAttempts;
      if (final) {
        void this.routeToDlq(queue, job, err).then(() =>
          lifecycle?.onDeadLetter?.(toIncoming(job), err),
        );
      } else {
        void lifecycle?.onFailed?.(toIncoming(job), err, true);
      }
    });
    worker.on('error', (err) => {
      this.logger?.error('worker error', { queue, error: err.message });
    });

    this.workers.push(worker);
  }

  private async routeToDlq(queue: QueueName, job: Job, err: Error): Promise<void> {
    await this.queue(dlqName(queue)).add(
      job.name,
      { originalId: job.id, payload: job.data, error: err.message, failedAt: new Date().toISOString() },
      { removeOnComplete: false, attempts: 1 },
    );
  }

  dispatcher(): JobDispatcher {
    if (!this.dispatcherInstance) {
      const provider = this;
      this.dispatcherInstance = {
        async dispatch<T>(
          queue: QueueName,
          name: string,
          payload: T,
          opts?: DispatchOptions,
        ): Promise<DispatchResult> {
          const q = provider.queue(queue);
          const id = opts?.jobId;
          if (id) {
            const existing = await q.getJob(id);
            if (existing) return { id, deduped: true };
          }
          const jobOpts: JobsOptions = {
            jobId: id,
            delay: opts?.delayMs,
            attempts: opts?.attempts ?? MAX_ATTEMPTS,
            backoff: { type: 'custom' },
            removeOnComplete: 1000,
            removeOnFail: false,
          };
          const job = await q.add(name, payload, jobOpts);
          return { id: String(job.id), deduped: false };
        },
        close: async () => undefined,
      };
    }
    return this.dispatcherInstance;
  }

  async schedule<T>(
    queue: QueueName,
    name: string,
    payload: T,
    cron: string,
    opts?: DispatchOptions,
  ): Promise<void> {
    await this.queue(queue).add(name, payload, {
      repeat: { pattern: cron },
      jobId: opts?.jobId,
      attempts: opts?.attempts ?? MAX_ATTEMPTS,
      backoff: { type: 'custom' },
    });
  }

  async start(): Promise<void> {
    /* Workers iniciam ao serem criados. */
  }

  async ping(): Promise<boolean> {
    try {
      // getJobCounts faz round-trip ao Redis — falha se indisponível.
      await this.queue('mm.healthcheck').getJobCounts();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
