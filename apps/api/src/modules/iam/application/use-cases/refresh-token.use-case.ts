import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { IssueTokensService, IssueContext } from '../services/issue-tokens.service';
import { AuthResult } from '../dto/auth-result';
import { InvalidRefreshTokenError } from '../errors';

export interface RefreshInput extends IssueContext {
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly issueTokens: IssueTokensService,
  ) {}

  async execute(input: RefreshInput): Promise<AuthResult> {
    const tokenHash = this.tokens.hashToken(input.refreshToken);
    const record = await this.refreshTokens.findByHash(tokenHash);

    if (!record) {
      throw new InvalidRefreshTokenError();
    }

    // Reuso de um token já revogado => possível roubo. Revoga toda a árvore de sessões.
    if (record.revokedAt) {
      await this.refreshTokens.revokeAllForUser(record.userId);
      throw new InvalidRefreshTokenError();
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    // Rotação: emite novo par e revoga o atual apontando para o substituto.
    const issued = await this.issueTokens.issue(user, {
      userAgent: input.userAgent,
      ip: input.ip,
    });
    await this.refreshTokens.revoke(record.id, issued.refreshTokenId);

    return {
      user: user.toPublic(),
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
    };
  }
}
