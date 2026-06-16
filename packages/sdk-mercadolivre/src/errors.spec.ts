import { MercadoLivreApiError, MercadoLivreTransportError } from './errors';

describe('errors', () => {
  it('MercadoLivreApiError.isAuthError detecta 401/403', () => {
    expect(new MercadoLivreApiError(401, 'x').isAuthError).toBe(true);
    expect(new MercadoLivreApiError(403, 'x').isAuthError).toBe(true);
    expect(new MercadoLivreApiError(404, 'x').isAuthError).toBe(false);
  });

  it('preserva status, body e cause', () => {
    const api = new MercadoLivreApiError(429, 'rate', { detail: 'slow down' });
    expect(api.status).toBe(429);
    expect(api.body).toEqual({ detail: 'slow down' });

    const cause = new Error('socket');
    const transport = new MercadoLivreTransportError('net', cause);
    expect(transport.cause).toBe(cause);
  });
});
