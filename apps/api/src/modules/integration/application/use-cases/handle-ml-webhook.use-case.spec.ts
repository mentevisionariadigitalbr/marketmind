import { HandleMercadoLivreWebhookUseCase } from './handle-ml-webhook.use-case';
import { FakeWebhookEventRepository } from '../__fixtures__/integration-fakes';

describe('HandleMercadoLivreWebhookUseCase', () => {
  let webhooks: FakeWebhookEventRepository;
  let useCase: HandleMercadoLivreWebhookUseCase;

  beforeEach(() => {
    webhooks = new FakeWebhookEventRepository();
    useCase = new HandleMercadoLivreWebhookUseCase(webhooks);
  });

  it('registra notificação nova (duplicated=false)', async () => {
    const out = await useCase.execute({ _id: 'n1', topic: 'orders_v2', resource: '/orders/123' });
    expect(out).toEqual({ duplicated: false });
  });

  it('reprocessar a mesma notificação é idempotente (duplicated=true)', async () => {
    const n = { _id: 'n1', topic: 'orders_v2', resource: '/orders/123' };
    await useCase.execute(n);
    const second = await useCase.execute(n);
    expect(second).toEqual({ duplicated: true });
    expect(webhooks.keys.size).toBe(1);
  });

  it('deduplica por topic+resource+sent quando não há _id', async () => {
    const n = { topic: 'orders_v2', resource: '/orders/9', sent: '2026-06-16T00:00:00Z' };
    expect(await useCase.execute(n)).toEqual({ duplicated: false });
    expect(await useCase.execute(n)).toEqual({ duplicated: true });
  });
});
