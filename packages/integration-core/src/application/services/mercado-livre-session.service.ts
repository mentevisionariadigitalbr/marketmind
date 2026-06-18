import { Inject, Injectable } from '@nestjs/common';
import { TOKEN_CIPHER, TokenCipher } from '../../crypto/token-cipher.port';
import {
  MARKETPLACE_ACCOUNT_REPOSITORY,
  MarketplaceAccount,
  MarketplaceAccountRepository,
} from '../../domain/ports/marketplace-account.repository';
import {
  MERCADO_LIVRE_API_FACTORY,
  MERCADO_LIVRE_OAUTH,
  MercadoLivreApi,
  MercadoLivreApiFactory,
  MercadoLivreOAuthPort,
} from '../../domain/ports/mercado-livre.port';

const EXPIRY_SKEW_MS = 60_000;

/**
 * Resolve um cliente ML pronto para uma conta: decifra o access token e, se
 * estiver expirado (ou perto), renova via refresh token e persiste os novos
 * tokens cifrados — atendendo "token expira e é renovado automaticamente".
 */
@Injectable()
export class MercadoLivreSession {
  constructor(
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    @Inject(MERCADO_LIVRE_OAUTH) private readonly oauth: MercadoLivreOAuthPort,
    @Inject(MARKETPLACE_ACCOUNT_REPOSITORY)
    private readonly accounts: MarketplaceAccountRepository,
    @Inject(MERCADO_LIVRE_API_FACTORY) private readonly apiFactory: MercadoLivreApiFactory,
  ) {}

  async apiForAccount(account: MarketplaceAccount, now: number = Date.now()): Promise<MercadoLivreApi> {
    let accessToken = this.cipher.decrypt(account.accessTokenEnc);

    if (this.isExpired(account.tokenExpiresAt, now)) {
      const refreshToken = this.cipher.decrypt(account.refreshTokenEnc);
      const tokens = await this.oauth.refresh(refreshToken);
      accessToken = tokens.accessToken;
      await this.accounts.updateTokens(account.id, {
        accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
        refreshTokenEnc: this.cipher.encrypt(tokens.refreshToken),
        tokenExpiresAt: new Date(tokens.obtainedAt + tokens.expiresIn * 1000),
        status: 'CONNECTED',
      });
    }

    return this.apiFactory.create(accessToken);
  }

  private isExpired(expiresAt: Date, now: number): boolean {
    return now >= expiresAt.getTime() - EXPIRY_SKEW_MS;
  }
}
