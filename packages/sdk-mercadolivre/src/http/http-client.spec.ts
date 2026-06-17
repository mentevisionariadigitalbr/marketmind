import { HttpClient, FetchInit, FetchLike, FetchResponse } from './http-client';
import { MercadoLivreApiError, MercadoLivreTransportError } from '../errors';

function res(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
): FetchResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n) => headers[n.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function mockFetch(queue: Array<FetchResponse | Error>) {
  const calls: Array<{ url: string; init?: FetchInit }> = [];
  let i = 0;
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const next = queue[Math.min(i, queue.length - 1)];
    i += 1;
    if (next instanceof Error) throw next;
    return next;
  };
  return { fn, calls };
}

describe('HttpClient', () => {
  it('monta URL com query, injeta Authorization e faz parse do JSON', async () => {
    const { fn, calls } = mockFetch([res(200, { id: 7 })]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn });

    const out = await client.request<{ id: number }>({
      path: '/orders/search',
      query: { seller: 99, status: undefined, limit: 50 },
      accessToken: 'tok-1',
    });

    expect(out).toEqual({ id: 7 });
    expect(calls[0].url).toBe('https://api.test/orders/search?seller=99&limit=50');
    expect(calls[0].init?.headers?.Authorization).toBe('Bearer tok-1');
  });

  it('repete em 429 honrando Retry-After e depois conclui', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { fn, calls } = mockFetch([res(429, { error: 'rate' }, { 'retry-after': '1' }), res(200, { ok: true })]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn, sleep });

    const out = await client.request<{ ok: boolean }>({ path: '/x' });

    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(sleep).toHaveBeenCalledWith(1000); // 1s do Retry-After
  });

  it('repete em 5xx com backoff e depois conclui', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { fn, calls } = mockFetch([res(503), res(200, { ok: true })]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn, sleep, baseDelayMs: 100 });

    await client.request({ path: '/x' });

    expect(calls).toHaveLength(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('não repete em 4xx (exceto 429) e lança MercadoLivreApiError', async () => {
    const { fn, calls } = mockFetch([res(404, { message: 'not found' })]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn });

    await expect(client.request({ path: '/x' })).rejects.toBeInstanceOf(MercadoLivreApiError);
    expect(calls).toHaveLength(1);
  });

  it('esgota as tentativas e lança após maxRetries', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { fn, calls } = mockFetch([res(500)]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn, sleep, maxRetries: 2 });

    await expect(client.request({ path: '/x' })).rejects.toBeInstanceOf(MercadoLivreApiError);
    expect(calls).toHaveLength(3); // 1 inicial + 2 retries
  });

  it('repete em erro de rede e propaga MercadoLivreTransportError se persistir', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { fn, calls } = mockFetch([new Error('ECONNRESET')]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn, sleep, maxRetries: 1 });

    await expect(client.request({ path: '/x' })).rejects.toBeInstanceOf(MercadoLivreTransportError);
    expect(calls).toHaveLength(2);
  });

  it('aplica rate-limit (espaçamento mínimo entre requisições)', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { fn } = mockFetch([res(200, {})]);
    const client = new HttpClient({
      baseUrl: 'https://api.test',
      fetch: fn,
      sleep,
      minIntervalMs: 500,
      now: () => 1000,
    });

    await client.request({ path: '/a' });
    await client.request({ path: '/b' });

    expect(sleep).toHaveBeenCalledWith(500); // 2ª requisição respeita o intervalo
  });

  it('trata 204 como corpo vazio', async () => {
    const { fn } = mockFetch([res(204)]);
    const client = new HttpClient({ baseUrl: 'https://api.test', fetch: fn });
    await expect(client.request({ path: '/x' })).resolves.toBeUndefined();
  });

  it('integra o circuit breaker: protege a chamada externa', async () => {
    // Breaker que abre após 1 falha (estruturalmente compatível com o do pacote de filas).
    let state: 'closed' | 'open' = 'closed';
    const breaker = {
      execute: async <T>(f: () => Promise<T>): Promise<T> => {
        if (state === 'open') throw new Error('CircuitOpen');
        try {
          return await f();
        } catch (e) {
          state = 'open';
          throw e;
        }
      },
    };
    const { fn, calls } = mockFetch([res(500), res(200, { ok: true })]);
    const client = new HttpClient({
      baseUrl: 'https://api.test',
      fetch: fn,
      sleep: jest.fn().mockResolvedValue(undefined),
      maxRetries: 0,
      circuitBreaker: breaker,
    });

    await expect(client.request({ path: '/a' })).rejects.toBeInstanceOf(MercadoLivreApiError);
    // Circuito aberto: a 2ª chamada nem toca a rede.
    await expect(client.request({ path: '/b' })).rejects.toThrow('CircuitOpen');
    expect(calls).toHaveLength(1);
  });
});
