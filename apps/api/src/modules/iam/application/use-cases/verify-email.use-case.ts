import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { USER_TOKEN_REPOSITORY, UserTokenRepository } from '../../domain/ports/user-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { InvalidVerificationTokenError } from '../errors';

/**
 * Confirma o e-mail a partir do token (uso único). Token inválido/expirado/já
 * usado é rejeitado.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_TOKEN_REPOSITORY) private readonly userTokens: UserTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(input: { token: string }): Promise<void> {
    const consumed = await this.userTokens.consume(this.tokens.hashToken(input.token), 'EMAIL_VERIFICATION');
    if (!consumed) {
      throw new InvalidVerificationTokenError();
    }
    await this.users.markEmailVerified(consumed.userId);
  }
}
