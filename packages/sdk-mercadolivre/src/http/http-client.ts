import { MercadoLivreApiError, MercadoLivreTransportError } from '../errors';

export interface FetchResponse {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export type FetchLike = (url: string, init?: FetchInit) => Promise<FetchResponse>;

/**
 * Porta mínima de circuit breaker. O SDK não depende de `@marketmind/queue`:
 * qualquer implementação com `execute()` serve (o CircuitBreaker do pacote de
 * filas é estruturalmente compatível).
 */
export interface CircuitBreakerLike {
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

export interface HttpClientOptions {
  baseUrl: string;
  /** Injetável para testes; default: `globalThis.fetch`. */
  fetch?: FetchLike;
  /** Máximo de novas tentativas (além da primeira). Default: 3. */
  maxRetries?: number;
  /** Base do backoff exponencial, em ms. Default: 300. */
  baseDelayMs?: number;
  /** Espaçamento mínimo entre requisições (rate-limit simples), em ms. Default: 0. */
  minIntervalMs?: number;
  /** Circuit breaker para a API externa (protege contra cascata de falhas). */
  circuitBreaker?: CircuitBreakerLike;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: string;
  accessToken?: string;
}

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

/**
 * Cliente HTTP do SDK: monta URLs, injeta Authorization, e adiciona resiliência
 * (retry com backoff exponencial honrando Retry-After, e rate-limit por
 * espaçamento mínimo). Tudo injetável (`fetch`, `now`, `sleep`) para testes.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly breaker?: CircuitBreakerLike;
  private nextSlot = 0;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.fetchFn = opts.fetch ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike);
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 300;
    this.minIntervalMs = opts.minIntervalMs ?? 0;
    this.now = opts.now ?? (() => Date.now());
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.breaker = opts.circuitBreaker;
    if (!this.fetchFn) {
      throw new Error('HttpClient: nenhuma implementação de fetch disponível.');
    }
  }

  /** Executa a requisição (com retry) protegida pelo circuit breaker, se houver. */
  async request<T>(opts: RequestOptions): Promise<T> {
    if (this.breaker) {
      return this.breaker.execute(() => this.doRequest<T>(opts));
    }
    return this.doRequest<T>(opts);
  }

  private async doRequest<T>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
    const init: FetchInit = { method: opts.method ?? 'GET', headers, body: opts.body };

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.throttle();

      let res: FetchResponse;
      try {
        res = await this.fetchFn(url, init);
      } catch (err) {
        lastError = new MercadoLivreTransportError('Falha de rede ao chamar o Mercado Livre.', err);
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoff(attempt));
          continue;
        }
        throw lastError;
      }

      if (res.ok) {
        return this.parse<T>(res);
      }

      const body = await this.safeBody(res);
      if (RETRYABLE_STATUS(res.status) && attempt < this.maxRetries) {
        await this.sleep(this.retryDelay(res, attempt));
        continue;
      }
      throw new MercadoLivreApiError(res.status, this.errorMessage(res.status, body), body);
    }

    throw lastError ?? new MercadoLivreTransportError('Requisição falhou sem resposta.');
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const qs = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    const full = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    return qs ? `${full}${full.includes('?') ? '&' : '?'}${qs}` : full;
  }

  private async parse<T>(res: FetchResponse): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async safeBody(res: FetchResponse): Promise<unknown> {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : undefined;
    } catch {
      return undefined;
    }
  }

  private retryDelay(res: FetchResponse, attempt: number): number {
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) return seconds * 1000;
    }
    return this.backoff(attempt);
  }

  private backoff(attempt: number): number {
    const exp = this.baseDelayMs * 2 ** attempt;
    const jitter = Math.floor(Math.random() * this.baseDelayMs);
    return exp + jitter;
  }

  private errorMessage(status: number, body: unknown): string {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : undefined;
    return `Mercado Livre respondeu ${status}${message ? `: ${message}` : ''}`;
  }

  /** Espaçamento mínimo entre requisições (rate-limit simples). */
  private async throttle(): Promise<void> {
    if (this.minIntervalMs <= 0) return;
    const now = this.now();
    const wait = Math.max(0, this.nextSlot - now);
    this.nextSlot = Math.max(now, this.nextSlot) + this.minIntervalMs;
    if (wait > 0) await this.sleep(wait);
  }
}
