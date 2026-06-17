import { randomUUID } from 'node:crypto';
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
} from '../ports';
import { MAX_ATTEMPTS, isFinalAttempt } from '../retry';

interface Registered {
  handler: JobHandler;
  lifecycle?: JobLifecycle;
  opts?: WorkerOptions;
}

export interface DeadLetterRecord {
  queue: string;
  name: string;
  id: string;
  payload: unknown;
  error: Error;
}

/**
 * Adapter de filas EM MEMÓRIA para testes: processa de forma síncrona aplicando
 * a MESMA política de retry/DLQ/idempotência do runtime — permitindo testar a
 * orquestração de forma determinística, sem Redis.
 */
export class InMemoryQueueProvider implements QueueProvider {
  private readonly workers = new Map<string, Registered>();
  private readonly seen = new Set<string>();
  readonly dispatched: Array<{ queue: string; name: string; id: string; payload: unknown }> = [];
  readonly deadLetters: DeadLetterRecord[] = [];

  registerWorker<T>(
    queue: QueueName,
    handler: JobHandler<T>,
    lifecycle?: JobLifecycle,
    opts?: WorkerOptions,
  ): void {
    this.workers.set(queue, { handler: handler as JobHandler, lifecycle, opts });
  }

  dispatcher(): JobDispatcher {
    return {
      dispatch: <T>(queue: QueueName, name: string, payload: T, opts?: DispatchOptions) =>
        this.dispatch(queue, name, payload, opts),
      close: async () => undefined,
    };
  }

  async schedule<T>(queue: QueueName, name: string, payload: T): Promise<void> {
    // Em memória, agendar é registrar como já despachado (sem timer real).
    await this.dispatch(queue, name, payload);
  }

  async start(): Promise<void> {
    /* noop */
  }
  async close(): Promise<void> {
    this.workers.clear();
  }

  private async dispatch<T>(
    queue: QueueName,
    name: string,
    payload: T,
    opts?: DispatchOptions,
  ): Promise<DispatchResult> {
    const id = opts?.jobId ?? randomUUID();
    if (opts?.jobId && this.seen.has(id)) {
      return { id, deduped: true };
    }
    this.seen.add(id);
    this.dispatched.push({ queue, name, id, payload });

    const worker = this.workers.get(queue);
    if (worker) {
      await this.runWithRetry(queue, name, id, payload, worker, opts?.attempts ?? MAX_ATTEMPTS);
    }
    return { id, deduped: false };
  }

  private async runWithRetry(
    queue: string,
    name: string,
    id: string,
    payload: unknown,
    worker: Registered,
    maxAttempts: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const job: IncomingJob = { id, name, queue, data: payload, attemptsMade: attempt, maxAttempts };
      await worker.lifecycle?.onActive?.(job);
      const start = Date.now();
      try {
        await worker.handler(job);
        await worker.lifecycle?.onCompleted?.(job, Date.now() - start);
        return;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const final = isFinalAttempt(attempt, maxAttempts);
        await worker.lifecycle?.onFailed?.(job, error, !final);
        if (final) {
          this.deadLetters.push({ queue, name, id, payload, error });
          await worker.lifecycle?.onDeadLetter?.(job, error);
          return;
        }
      }
    }
  }
}
