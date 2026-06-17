import { MetricsRegistry, METRIC, StructuredLogger, IncomingJob } from '@marketmind/queue';
import { makeJobLifecycle } from './job-mirror';
import { JobRecord, JobStore } from '../jobs/job-store';

class FakeStore implements JobStore {
  records: JobRecord[] = [];
  async save(r: JobRecord) {
    this.records.push(r);
  }
}

const silent = new StructuredLogger({}, () => undefined);
const job: IncomingJob = {
  id: 'j1',
  name: 'fetch',
  queue: 'ml.order.fetch',
  data: { companyId: 'c1' },
  attemptsMade: 1,
  maxAttempts: 5,
};

describe('makeJobLifecycle', () => {
  it('completed: conta métricas e persiste status completed', async () => {
    const store = new FakeStore();
    const metrics = new MetricsRegistry();
    const lc = makeJobLifecycle({ queue: 'ml.order.fetch', store, metrics, logger: silent });

    await lc.onActive!(job);
    await lc.onCompleted!(job, 123);

    expect(metrics.counter(METRIC.PROCESSED, { queue: 'ml.order.fetch' })).toBe(1);
    expect(metrics.histogram(METRIC.PROCESSING_TIME, { queue: 'ml.order.fetch' })?.sum).toBe(123);
    expect(store.records.map((r) => r.status)).toEqual(['processing', 'completed']);
    expect(store.records[1].companyId).toBe('c1');
  });

  it('failed com retry: conta failed + retried', async () => {
    const store = new FakeStore();
    const metrics = new MetricsRegistry();
    const lc = makeJobLifecycle({ queue: 'ml.order.fetch', store, metrics, logger: silent });

    await lc.onFailed!(job, new Error('boom'), true);

    expect(metrics.counter(METRIC.FAILED, { queue: 'ml.order.fetch' })).toBe(1);
    expect(metrics.counter(METRIC.RETRIED, { queue: 'ml.order.fetch' })).toBe(1);
    expect(store.records[0]).toMatchObject({ status: 'failed', error: 'boom' });
  });

  it('dead letter: conta dlq e persiste dead_letter', async () => {
    const store = new FakeStore();
    const metrics = new MetricsRegistry();
    const lc = makeJobLifecycle({ queue: 'ml.order.fetch', store, metrics, logger: silent });

    await lc.onDeadLetter!(job, new Error('dead'));

    expect(metrics.counter(METRIC.DLQ, { queue: 'ml.order.fetch' })).toBe(1);
    expect(store.records[0]).toMatchObject({ status: 'dead_letter', error: 'dead' });
  });

  it('falha de persistência não propaga (best-effort)', async () => {
    const store: JobStore = { save: jest.fn().mockRejectedValue(new Error('db down')) };
    const metrics = new MetricsRegistry();
    const lc = makeJobLifecycle({ queue: 'q', store, metrics, logger: silent });
    await expect(lc.onCompleted!(job, 10)).resolves.toBeUndefined();
  });
});
