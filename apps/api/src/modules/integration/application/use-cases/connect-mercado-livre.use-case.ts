import { Inject, Injectable } from '@nestjs/common';
import { TOKEN_CIPHER, TokenCipher } from '../../../../shared/crypto/token-cipher.port';
import {
  MARKETPLACE_ACCOUNT_REPOSITORY,
  MarketplaceAccountRepository,
} from '../../domain/ports/marketplace-account.repository';
import {
  MERCADO_LIVRE_API_FACTORY,
  MERCADO_LIVRE_OAUTH,
  MercadoLivreApiFactory,
  MercadoLivreOAuthPort,
} from '../../domain/ports/mercado-livre.port';
import { IntegrationNotConfiguredError } from '../errors';

const MERCADO_LIVRE_CODE = 'MERCADO_LIVRE';

export interface ConnectMercadoLivreInput {
  companyId: string;
  code: string;
}

export interface ConnectedAccount {
  id: string;
  externalUserId: string;
  nickname: string | null;
}

/**
 * Conclui o OAuth do Mercado Livre: troca o code por tokens, identifica o
 * vendedor e persiste a conta com os tokens **cifrados em repouso**. Reconexão
 * é idempotente (upsert por company+marketplace+externalUser).
 */
@Injectable()
export class ConnectMercadoLivreUseCase {
  constructor(
    @Inject(MERCADO_LIVRE_OAUTH) private readonly oauth: MercadoLivreOAuthPort,
    @Inject(MERCADO_LIVRE_API_FACTORY) private readonly apiFactory: MercadoLivreApiFactory,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
  ) {}

  async execute(input: ConnectMercadoLivreInput): Promise<ConnectedAccount> {
    const tokens = await this.oauth.exchangeCode(input.code);
    const me = await this.apiFactory.create(tokens.accessToken).getMe();

    const marketplaceId = await this.accounts.findMarketplaceIdByCode(MERCADO_LIVRE_CODE);
    if (!marketplaceId) {
      throw new IntegrationNotConfiguredError('Marketplace Mercado Livre não cadastrado (seed).');
    }

    const account = await this.accounts.upsert({
      companyId: input.companyId,
      marketplaceId,
      externalUserId: String(tokens.userId),
      nickname: me.nickname ?? null,
      accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
      refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken),
      tokenExpiresAt: new Date(tokens.obtainedAt + tokens.expiresIn * 1000),
    });

    return { id: account.id, externalUserId: account.externalUserId, nickname: account.nickname };
  }
}
