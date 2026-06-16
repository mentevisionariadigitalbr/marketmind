import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(input: { refreshToken: string }): Promise<void> {
    const record = await this.refreshTokens.findByHash(this.tokens.hashToken(input.refreshToken));
    if (record && !record.revokedAt) {
      await this.refreshTokens.revoke(record.id);
    }
  }
}
