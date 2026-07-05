import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { USER_TOKEN_REPOSITORY, UserTokenRepository } from '../../domain/ports/user-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRepository } from '../../domain/ports/refresh-token.repository';
import { InvalidResetTokenError, ValidationError } from '../errors';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Redefine a senha a partir do token de reset (uso único). Após trocar, revoga
 * todas as sessões ativas do usuário (segurança).
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_TOKEN_REPOSITORY) private readonly userTokens: UserTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(input: { token: string; password: string }): Promise<void> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    const consumed = await this.userTokens.consume(this.tokens.hashToken(input.token), 'PASSWORD_RESET');
    if (!consumed) {
      throw new InvalidResetTokenError();
    }
    const passwordHash = await this.hasher.hash(input.password);
    await this.users.updatePassword(consumed.userId, passwordHash);
    await this.refreshTokens.revokeAllForUser(consumed.userId);
  }
}
