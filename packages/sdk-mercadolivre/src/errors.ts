/** Erro de uma resposta não-OK da API do Mercado Livre (após esgotar retries). */
export class MercadoLivreApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'MercadoLivreApiError';
  }

  /** 401/403 — token inválido/expirado: o chamador deve renovar e tentar de novo. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** Falha de rede/transporte (fetch lançou) após esgotar retries. */
export class MercadoLivreTransportError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MercadoLivreTransportError';
  }
}
