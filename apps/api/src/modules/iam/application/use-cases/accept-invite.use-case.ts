import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { InvalidInviteError, ValidationError } from '../errors';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Aceita um convite (fluxo público): valida o token, define a senha e ativa o
 * usuário. RLS é "aberto" sem contexto de tenant (auth-bootstrap), como no login.
 */
@Injectable()
export class AcceptInviteUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: { token: string; password: string }): Promise<void> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    const invite = await this.users.findInviteByTokenHash(this.tokens.hashToken(input.token));
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      throw new InvalidInviteError();
    }
    const passwordHash = await this.hasher.hash(input.password);
    await this.users.activateFromInvite(invite.userId, passwordHash);
  }
}
