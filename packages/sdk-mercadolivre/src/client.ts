import { HttpClient, FetchLike, CircuitBreakerLike } from './http/http-client';
import { UsersResource } from './resources/users';
import { OrdersResource } from './resources/orders';
import { ItemsResource } from './resources/items';
import { CategoriesResource } from './resources/categories';
import { QuestionsResource } from './resources/questions';

const DEFAULT_API_BASE = 'https://api.mercadolibre.com';

export interface MercadoLivreClientOptions {
  accessToken: string;
  apiBaseUrl?: string;
  fetch?: FetchLike;
  maxRetries?: number;
  minIntervalMs?: number;
  /** Circuit breaker compartilhado para a API do ML. */
  circuitBreaker?: CircuitBreakerLike;
  /** HttpClient pré-construído (testes). */
  http?: HttpClient;
}

/**
 * Cliente do Mercado Livre já autenticado (com access token). Agrupa os recursos
 * tipados. O token pode ser atualizado após um refresh via `setAccessToken`.
 */
export class MercadoLivreClient {
  private accessToken: string;

  readonly users: UsersResource;
  readonly orders: OrdersResource;
  readonly items: ItemsResource;
  readonly categories: CategoriesResource;
  readonly questions: QuestionsResource;

  constructor(opts: MercadoLivreClientOptions) {
    this.accessToken = opts.accessToken;
    const http =
      opts.http ??
      new HttpClient({
        baseUrl: opts.apiBaseUrl ?? DEFAULT_API_BASE,
        fetch: opts.fetch,
        maxRetries: opts.maxRetries,
        minIntervalMs: opts.minIntervalMs,
        circuitBreaker: opts.circuitBreaker,
      });

    const token = () => this.accessToken;
    this.users = new UsersResource(http, token);
    this.orders = new OrdersResource(http, token);
    this.items = new ItemsResource(http, token);
    this.categories = new CategoriesResource(http, token);
    this.questions = new QuestionsResource(http, token);
  }

  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }
}
