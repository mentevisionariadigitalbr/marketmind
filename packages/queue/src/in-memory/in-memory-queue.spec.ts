import { InMemoryQueueProvider } from './in-memory-queue';
import { QUEUES, IncomingJob, JobLifecycle } from '../ports';

function recordingLifecycle() {
  const events: string[] = [];
  const lifecycle: JobLifecycle = {
    onActive: (j) => void events.push(`active:${j.attemptsMade}`),
    onCompleted: () => void events.push('completed'),
    onFailed: (_j, _e, willRetry) => void events.push(`failed:retry=${willRetry}`),
    onDeadLetter: () => void events.push('dead_letter'),
  };
  return { events, lifecycle };
}

describe('InMemoryQueueProvider', () => {
  it('processa um job com sucesso e dispara o ciclo de vida', async () => {
    const q = new InMemoryQueueProvider();
    const seen: IncomingJob[] = [];
    const { events, lifecycle } = recordingLifecycle();
    q.registerWorker(QUEUES.ORDER_FETCH, async (job) => void seen.push(job), lifecycle);

    const res = await q.dispatcher().dispatch(QUEUES.ORDER_FETCH, 'fetch', { orderId: 1 });

    expect(res.deduped).toBe(false);
    expect(seen).toHaveLength(1);
    expect(seen[0].data).toEqual({ orderId: 1 });
    expect(events).toEqual(['active:1', 'completed']);
  });

  it('reexecuta em falha e vai para DLQ após esgotar tentativas', async () => {
    const q = new InMemoryQueueProvider();
    const { events, lifecycle } = recordingLifecycle();
    q.registerWorker(QUEUES.ORDER_FETCH, async () => {
      throw new Error('always fails');
    }, lifecycle);

    await q.dispatcher().dispatch(QUEUES.ORDER_FETCH, 'fetch', {});

    expect(q.deadLetters).toHaveLength(1);
    expect(q.deadLetters[0].error.message).toBe('always fails');
    // 5 tentativas: 4 com retry + 1 final sem retry, depois dead_letter
    expect(events.filter((e) => e === 'failed:retry=true')).toHaveLength(4);
    expect(events).toContain('failed:retry=false');
    expect(events).toContain('dead_letter');
  });

  it('recupera após falhas transitórias (sem DLQ)', async () => {
    const q = new InMemoryQueueProvider();
    let attempts = 0;
    q.registerWorker(QUEUES.ORDER_FETCH, async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
    });

    await q.dispatcher().dispatch(QUEUES.ORDER_FETCH, 'fetch', {});

    expect(attempts).toBe(3);
    expect(q.deadLetters).toHaveLength(0);
  });

  it('idempotência: mesmo jobId não processa duas vezes', async () => {
    const q = new InMemoryQueueProvider();
    let runs = 0;
    q.registerWorker(QUEUES.WEBHOOK_PROCESS, async () => void (runs += 1));

    const d = q.dispatcher();
    const a = await d.dispatch(QUEUES.WEBHOOK_PROCESS, 'process', { x: 1 }, { jobId: 'dedupe-1' });
    const b = await d.dispatch(QUEUES.WEBHOOK_PROCESS, 'process', { x: 1 }, { jobId: 'dedupe-1' });

    expect(a.deduped).toBe(false);
    expect(b.deduped).toBe(true);
    expect(runs).toBe(1);
  });
});
