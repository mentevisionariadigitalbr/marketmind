import { InMemoryQueueProvider, QUEUES, StructuredLogger, IncomingJob } from '@marketmind/queue';
import { makeWebhookProcessor, WebhookJobData } from './webhook-process.processor';
import { makeOrderFetchProcessor, OrderFetchJobData } from './order-fetch.processor';
import { makeAccountRefreshProcessor, AccountRefreshJobData } from './account-refresh.processor';
import { AccountLike, AccountLookup, OrderSyncRunner, SessionRefresher, WithTenant } from './ports';

const silentLogger = new StructuredLogger({}, () => undefined);
const withTenant: WithTenant = (_companyId, fn) => fn();

function job<T>(data: T): IncomingJob<T> {
  return { id: 'j1', name: 'n', queue: 'q', data, attemptsMade: 1, maxAttempts: 5 };
}

const ACCOUNT: AccountLike = { id: 'acc-1', companyId: 'c1', externalUserId: '555' };

class FakeAccounts implements AccountLookup {
  constructor(private readonly accounts: AccountLike[] = [ACCOUNT]) {}
  async findById(id: string) {
    return this.accounts.find((a) => a.id === id) ?? null;
  }
  async findByExternalUserId(externalUserId: string) {
    return this.accounts.filter((a) => a.externalUserId === externalUserId);
  }
  async listConnected() {
    return this.accounts;
  }
}

describe('webhook processor (fan-out)', () => {
  it('despacha ml.order.fetch para tópicos de pedido', async () => {
    const queue = new InMemoryQueueProvider();
    const handler = makeWebhookProcessor({ dispatcher: queue.dispatcher(), logger: silentLogger });

    await handler(
      job<WebhookJobData>({ dedupeKey: 'd', topic: 'orders_v2', resource: '/orders/1', userId: 555 }),
    );

    expect(queue.dispatched).toHaveLength(1);
    expect(queue.dispatched[0].queue).toBe(QUEUES.ORDER_FETCH);
  });

  it('despacha ml.catalog.sync para tópicos de item', async () => {
    const queue = new InMemoryQueueProvider();
    const handler = makeWebhookProcessor({ dispatcher: queue.dispatcher(), logger: silentLogger });

    await handler(
      job<WebhookJobData>({ dedupeKey: 'd', topic: 'items', resource: '/items/MLB1', userId: 555 }),
    );

    expect(queue.dispatched[0].queue).toBe(QUEUES.CATALOG_SYNC);
  });

  it('ignora tópicos não suportados sem despachar', async () => {
    const queue = new InMemoryQueueProvider();
    const handler = makeWebhookProcessor({ dispatcher: queue.dispatcher(), logger: silentLogger });
    await handler(job<WebhookJobData>({ dedupeKey: 'd', topic: 'payments', resource: '/x', userId: 1 }));
    expect(queue.dispatched).toHaveLength(0);
  });
});

describe('order fetch processor', () => {
  it('resolve conta por userId e sincroniza dentro do tenant', async () => {
    const calls: string[] = [];
    const syncOrders: OrderSyncRunner = {
      execute: async ({ accountId }) => {
        calls.push(accountId);
        return { imported: 2, created: 2, updated: 0 };
      },
    };
    const handler = makeOrderFetchProcessor({
      accounts: new FakeAccounts(),
      syncOrders,
      withTenant,
      logger: silentLogger,
    });

    await handler(job<OrderFetchJobData>({ userId: 555 }));
    expect(calls).toEqual(['acc-1']);
  });

  it('não falha quando nenhuma conta é resolvida', async () => {
    const syncOrders: OrderSyncRunner = { execute: jest.fn() };
    const handler = makeOrderFetchProcessor({
      accounts: new FakeAccounts([]),
      syncOrders,
      withTenant,
      logger: silentLogger,
    });
    await expect(handler(job<OrderFetchJobData>({ userId: 999 }))).resolves.toBeUndefined();
    expect(syncOrders.execute).not.toHaveBeenCalled();
  });
});

describe('account refresh processor', () => {
  it('varre contas conectadas e renova cada uma', async () => {
    const refreshed: string[] = [];
    const session: SessionRefresher = {
      apiForAccount: async (a) => {
        refreshed.push((a as AccountLike).id);
        return {};
      },
    };
    const handler = makeAccountRefreshProcessor({
      accounts: new FakeAccounts([ACCOUNT, { id: 'acc-2', companyId: 'c2', externalUserId: '777' }]),
      session,
      withTenant,
      logger: silentLogger,
    });

    await handler(job<AccountRefreshJobData>({}));
    expect(refreshed).toEqual(['acc-1', 'acc-2']);
  });
});
