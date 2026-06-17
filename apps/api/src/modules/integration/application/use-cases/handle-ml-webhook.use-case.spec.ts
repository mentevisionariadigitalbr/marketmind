import { HandleMercadoLivreWebhookUseCase } from './handle-ml-webhook.use-case';
import { InMemoryQueueProvider, QUEUES } from '@marketmind/queue';
import { FakeWebhookEventRepository } from '../__fixtures__/integration-fakes';

describe('HandleMercadoLivreWebhookUseCase', () => {
  let webhooks: FakeWebhookEventRepository;
  let queue: InMemoryQueueProvider;
  let useCase: HandleMercadoLivreWebhookUseCase;

  beforeEach(() => {
    webhooks = new FakeWebhookEventRepository();
    queue = new InMemoryQueueProvider();
    useCase = new HandleMercadoLivreWebhookUseCase(webhooks, queue.dispatcher());
  });

  it('notificação nova: persiste e enfileira (não processa sincronicamente)', async () => {
    const out = await useCase.execute({ _id: 'n1', topic: 'orders_v2', resource: '/orders/123' });

    expect(out).toEqual({ duplicated: false, enqueued: true });
    expect(queue.dispatched).toHaveLength(1);
    expect(queue.dispatched[0].queue).toBe(QUEUES.WEBHOOK_PROCESS);
    expect(queue.dispatched[0].id).toBe('n1'); // jobId = dedupeKey
  });

  it('reprocessar a mesma notificação é idempotente e não re-enfileira', async () => {
    const n = { _id: 'n1', topic: 'orders_v2', resource: '/orders/123' };
    await useCase.execute(n);
    const second = await useCase.execute(n);

    expect(second).toEqual({ duplicated: true, enqueued: false });
    expect(queue.dispatched).toHaveLength(1);
    expect(webhooks.keys.size).toBe(1);
  });

  it('falha de enfileiramento não derruba o ACK (outbox já persistiu)', async () => {
    const failing = {
      dispatch: jest.fn().mockRejectedValue(new Error('redis down')),
      close: jest.fn(),
    };
    const uc = new HandleMercadoLivreWebhookUseCase(webhooks, failing);

    const out = await uc.execute({ _id: 'n2', topic: 'orders_v2', resource: '/orders/9' });

    expect(out).toEqual({ duplicated: false, enqueued: false });
    expect(webhooks.keys.has('n2')).toBe(true); // evento persistido
  });

  it('deduplica por topic+resource+sent quando não há _id', async () => {
    const n = { topic: 'orders_v2', resource: '/orders/9', sent: '2026-06-16T00:00:00Z' };
    expect((await useCase.execute(n)).duplicated).toBe(false);
    expect((await useCase.execute(n)).duplicated).toBe(true);
  });
});
