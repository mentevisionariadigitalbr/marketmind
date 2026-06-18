import { MercadoLivreOAuth } from '@marketmind/sdk-mercadolivre';
import {
  MercadoLivreOAuthPort,
  MlTokenSet,
} from '../../domain/ports/mercado-livre.port';
import { IntegrationNotConfiguredError } from '../../application/errors';

export interface MlOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/** Adapter da porta de OAuth do ML sobre o SDK próprio. */
export class MercadoLivreOAuthAdapter implements MercadoLivreOAuthPort {
  private readonly sdk: MercadoLivreOAuth | null;

  constructor(config: MlOAuthConfig) {
    this.sdk =
      config.clientId && config.clientSecret && config.redirectUri
        ? new MercadoLivreOAuth({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri,
          })
        : null;
  }

  authorizationUrl(state?: string): string {
    return this.client().authorizationUrl(state);
  }

  async exchangeCode(code: string): Promise<MlTokenSet> {
    return this.client().exchangeCode(code);
  }

  async refresh(refreshToken: string): Promise<MlTokenSet> {
    return this.client().refresh(refreshToken);
  }

  private client(): MercadoLivreOAuth {
    if (!this.sdk) {
      throw new IntegrationNotConfiguredError(
        'Integração Mercado Livre não configurada (defina ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI).',
      );
    }
    return this.sdk;
  }
}
