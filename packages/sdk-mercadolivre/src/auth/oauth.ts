import { HttpClient, FetchLike } from '../http/http-client';
import { TokenSet } from '../types';

const DEFAULT_AUTH_BASE = 'https://auth.mercadolivre.com.br';
const DEFAULT_API_BASE = 'https://api.mercadolibre.com';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authBaseUrl?: string;
  apiBaseUrl?: string;
  fetch?: FetchLike;
  now?: () => number;
  /** HttpClient pré-construído (testes). */
  http?: HttpClient;
}

interface RawToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  user_id: number;
}

/**
 * Fluxo OAuth2 (authorization code) do Mercado Livre: monta a URL de
 * autorização, troca o `code` por tokens e renova via `refresh_token`.
 */
export class MercadoLivreOAuth {
  private readonly authBaseUrl: string;
  private readonly http: HttpClient;
  private readonly now: () => number;

  constructor(private readonly config: OAuthConfig) {
    this.authBaseUrl = (config.authBaseUrl ?? DEFAULT_AUTH_BASE).replace(/\/$/, '');
    this.now = config.now ?? (() => Date.now());
    this.http =
      config.http ??
      new HttpClient({ baseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE, fetch: config.fetch });
  }

  /** URL para iniciar o consentimento do vendedor. `state` protege contra CSRF. */
  authorizationUrl(state?: string): string {
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
    };
    if (state) params.state = state;
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return `${this.authBaseUrl}/authorization?${qs}`;
  }

  /** Troca o authorization code por um TokenSet. */
  async exchangeCode(code: string): Promise<TokenSet> {
    return this.token({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });
  }

  /** Renova o access token a partir de um refresh token. */
  async refresh(refreshToken: string): Promise<TokenSet> {
    return this.token({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
    });
  }

  private async token(form: Record<string, string>): Promise<TokenSet> {
    const body = Object.entries(form)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const raw = await this.http.request<RawToken>({
      method: 'POST',
      path: '/oauth/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      expiresIn: raw.expires_in,
      obtainedAt: this.now(),
      tokenType: raw.token_type,
      scope: raw.scope,
      userId: raw.user_id,
    };
  }
}

/** Momento de expiração (epoch ms) de um TokenSet. */
export function tokenExpiresAt(token: TokenSet): number {
  return token.obtainedAt + token.expiresIn * 1000;
}

/** Se o token expira dentro de `skewMs` (default 60s), deve ser renovado. */
export function isTokenExpired(token: TokenSet, now: number = Date.now(), skewMs = 60_000): boolean {
  return now >= tokenExpiresAt(token) - skewMs;
}
