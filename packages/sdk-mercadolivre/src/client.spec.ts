import { MercadoLivreClient } from './client';
import { HttpClient, FetchInit, FetchLike, FetchResponse } from './http/http-client';

function res(status: number, body: unknown): FetchResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function recorder(body: unknown) {
  const calls: Array<{ url: string; init?: FetchInit }> = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return res(200, body);
  };
  return { calls, http: new HttpClient({ baseUrl: 'https://api.test', fetch: fn }) };
}

describe('MercadoLivreClient', () => {
  it('users.me chama /users/me com o token', async () => {
    const { calls, http } = recorder({ id: 555, nickname: 'LOJA' });
    const client = new MercadoLivreClient({ accessToken: 'AT', http });

    const me = await client.users.me();

    expect(me.id).toBe(555);
    expect(calls[0].url).toBe('https://api.test/users/me');
    expect(calls[0].init?.headers?.Authorization).toBe('Bearer AT');
  });

  it('orders.search monta os filtros corretos', async () => {
    const { calls, http } = recorder({ results: [], paging: { total: 0, offset: 0, limit: 50 } });
    const client = new MercadoLivreClient({ accessToken: 'AT', http });

    await client.orders.search({ sellerId: 555, status: 'paid', offset: 0, limit: 50 });

    expect(calls[0].url).toContain('/orders/search?');
    expect(calls[0].url).toContain('seller=555');
    expect(calls[0].url).toContain('order.status=paid');
  });

  it('orders.get e items.get usam o id no path', async () => {
    const { calls, http } = recorder({ id: 1 });
    const client = new MercadoLivreClient({ accessToken: 'AT', http });

    await client.orders.get(2000003);
    await client.items.get('MLB123');

    expect(calls[0].url).toBe('https://api.test/orders/2000003');
    expect(calls[1].url).toBe('https://api.test/items/MLB123');
  });

  it('setAccessToken atualiza o token usado nas chamadas seguintes', async () => {
    const { calls, http } = recorder({ id: 1 });
    const client = new MercadoLivreClient({ accessToken: 'OLD', http });

    await client.users.me();
    client.setAccessToken('NEW');
    await client.users.me();

    expect(calls[0].init?.headers?.Authorization).toBe('Bearer OLD');
    expect(calls[1].init?.headers?.Authorization).toBe('Bearer NEW');
  });

  it('users.get e items.bySeller usam os paths corretos', async () => {
    const { calls, http } = recorder({ results: [], paging: { total: 0, offset: 0, limit: 50 } });
    const client = new MercadoLivreClient({ accessToken: 'AT', http });

    await client.users.get(555);
    await client.items.bySeller(555, { status: 'active', offset: 0, limit: 50 });

    expect(calls[0].url).toBe('https://api.test/users/555');
    expect(calls[1].url).toContain('/users/555/items/search?');
    expect(calls[1].url).toContain('status=active');
  });

  it('items.getMany monta o multiget por ids', async () => {
    const { calls, http } = recorder([]);
    const client = new MercadoLivreClient({ accessToken: 'AT', http });
    await client.items.getMany(['MLB1', 'MLB2']);
    expect(calls[0].url).toContain('/items?ids=MLB1%2CMLB2');
  });

  it('categories.get e questions.search', async () => {
    const { calls, http } = recorder({ id: 'MLB1', name: 'Cat' });
    const client = new MercadoLivreClient({ accessToken: 'AT', http });

    await client.categories.get('MLB1');
    await client.questions.search({ itemId: 'MLB123', status: 'UNANSWERED' });

    expect(calls[0].url).toBe('https://api.test/categories/MLB1');
    expect(calls[1].url).toContain('/questions/search?');
    expect(calls[1].url).toContain('item=MLB123');
    expect(calls[1].url).toContain('status=UNANSWERED');
  });
});
