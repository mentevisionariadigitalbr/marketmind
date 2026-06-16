import { HttpClient, RequestOptions } from '../http/http-client';

/** Base dos recursos: injeta o access token corrente em cada chamada autenticada. */
export abstract class Resource {
  constructor(
    protected readonly http: HttpClient,
    protected readonly token: () => string,
  ) {}

  protected getJson<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.http.request<T>({ method: 'GET', path, query, accessToken: this.token() });
  }
}
