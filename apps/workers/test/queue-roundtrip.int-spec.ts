import { randomUUID } from 'node:crypto';
import {
  BullMqQueueProvider,
  IncomingJob,
  JobLifecycle,
  QueueName,
  StructuredLogger,
} from '@marketmind/queue';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';
const silent = new StructuredLogger({}, () => undefined);

const waitFor = async (predicate: () => boolean, timeoutMs = 8000): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout esperando condição');
    await new Promise((r) => setTimeout(r, 50));
  }
};

describe('BullMQ roundtrip (integration, real Redis)', () => {
  let provider: BullMqQueueProvider;

  beforeAll(() => {
    provider = new BullMqQueueProvider({ redisUrl: REDIS_URL, logger: silent });
  });

  afterAll(async () => {
    await provider.close();
  });

  it('enfileira e processa um job (produtor -> Redis -> worker)', async () => {
    const queue = `test.roundtrip.${randomUUID()}` as QueueName;
    const processed: unknown[] = [];
    provider.registerWorker(queue, async (job: IncomingJob) => {
      processed.push(job.data);
    });

    await provider.dispatcher().dispatch(queue, 'job', { hello: 'world' });
    await waitFor(() => processed.length === 1);

    expect(processed[0]).toEqual({ hello: 'world' });
  });

  it('idempotência na fila: mesmo jobId => 1 único processamento', async () => {
    const queue = `test.idem.${randomUUID()}` as QueueName;
    let runs = 0;
    provider.registerWorker(queue, async () => {
      runs += 1;
    });
    const d = provider.dispatcher();

    // Sequencial: o 2º despacho com o mesmo jobId é detectado como duplicado.
    const first = await d.dispatch(queue, 'job', { x: 1 }, { jobId: 'dedupe-key' });
    const second = await d.dispatch(queue, 'job', { x: 1 }, { jobId: 'dedupe-key' });
    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);

    // Rajada concorrente do mesmo jobId: invariante => continua 1 processamento.
    await Promise.all(
      Array.from({ length: 20 }, () => d.dispatch(queue, 'job', { x: 1 }, { jobId: 'dedupe-key' })),
    );
    await waitFor(() => runs >= 1);
    await new Promise((r) => setTimeout(r, 400));

    expect(runs).toBe(1);
  });

  it('vai para DLQ + dispara onDeadLetter quando esgota as tentativas', async () => {
    const queue = `test.dlq.${randomUUID()}` as QueueName;
    let deadLettered = false;
    let failedCount = 0;
    const lifecycle: JobLifecycle = {
      onFailed: () => void (failedCount += 1),
      onDeadLetter: () => void (deadLettered = true),
    };
    provider.registerWorker(
      queue,
      async () => {
        throw new Error('always fails');
      },
      lifecycle,
    );

    // attempts:1 => falha imediata -> DLQ (sem esperar o backoff real de 30s).
    await provider.dispatcher().dispatch(queue, 'job', {}, { attempts: 1 });
    await waitFor(() => deadLettered, 10000);

    expect(deadLettered).toBe(true);
    expect(failedCount).toBeGreaterThanOrEqual(1);
  });
});
