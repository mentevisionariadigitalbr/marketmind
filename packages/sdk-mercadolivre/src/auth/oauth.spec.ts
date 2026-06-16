import { MercadoLivreOAuth, isTokenExpired, tokenExpiresAt } from './oauth';
import { HttpClient, FetchInit, FetchLike, FetchResponse } from '../http/http-client';

function res(status: number, body: unknown): FetchResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const RAW_TOKEN = {
  access_token: 'AT-123',
  refresh_token: 'RT-456',
  expires_in: 21600,
  token_type: 'bearer',
  scope: 'offline_access read write',
  user_id: 555,
};

function oauthWith(capture: (url: string, init?: FetchInit) => void) {
  const fn: FetchLike = async (url, init) => {
    capture(url, init);
    return res(200, RAW_TOKEN);
  };
  const http = new HttpClient({ baseUrl: 'https://api.test', fetch: fn });
  return new MercadoLivreOAuth({
    clientId: 'app-1',
    clientSecret: 'secret-1',
    redirectUri: 'https://app.marketmind.ai/callback',
    http,
    now: () => 1_000_000,
  });
}

describe('MercadoLivreOAuth', () => {
  it('monta a authorization URL com client_id, redirect_uri, state', () => {
    const oauth = new MercadoLivreOAuth({
      clientId: 'app-1',
      clientSecret: 's',
      redirectUri: 'https://app.marketmind.ai/callback',
      authBaseUrl: 'https://auth.mercadolivre.com.br',
    });
    const url = oauth.authorizationUrl('xyz-state');
    expect(url).toContain('https://auth.mercadolivre.com.br/authorization?');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=app-1');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.marketmind.ai%2Fcallback');
    expect(url).toContain('state=xyz-state');
  });

  it('troca o code por tokens (grant_type=authorization_code, form-urlencoded)', async () => {
    let seenUrl = '';
    let seenInit: FetchInit | undefined;
    const oauth = oauthWith((u, i) => {
      seenUrl = u;
      seenInit = i;
    });

    const token = await oauth.exchangeCode('CODE-789');

    expect(seenUrl).toBe('https://api.test/oauth/token');
    expect(seenInit?.method).toBe('POST');
    expect(seenInit?.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(seenInit?.body).toContain('grant_type=authorization_code');
    expect(seenInit?.body).toContain('code=CODE-789');
    expect(token).toMatchObject({
      accessToken: 'AT-123',
      refreshToken: 'RT-456',
      expiresIn: 21600,
      userId: 555,
      obtainedAt: 1_000_000,
    });
  });

  it('renova via refresh_token', async () => {
    let body = '';
    const oauth = oauthWith((_, i) => {
      body = i?.body ?? '';
    });

    const token = await oauth.refresh('RT-old');

    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=RT-old');
    expect(token.accessToken).toBe('AT-123');
  });

  it('tokenExpiresAt / isTokenExpired respeitam o skew', () => {
    const token = {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 3600,
      obtainedAt: 0,
      tokenType: 'bearer',
      scope: '',
      userId: 1,
    };
    expect(tokenExpiresAt(token)).toBe(3_600_000);
    expect(isTokenExpired(token, 0)).toBe(false);
    // dentro da janela de skew (60s antes de expirar) => considerado expirado
    expect(isTokenExpired(token, 3_600_000 - 30_000)).toBe(true);
  });
});
