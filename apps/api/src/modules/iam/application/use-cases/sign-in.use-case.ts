import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { IssueTokensService, IssueContext } from '../services/issue-tokens.service';
import { AuthResult } from '../dto/auth-result';
import { InvalidCredentialsError, UserInactiveError } from '../errors';

export interface SignInInput extends IssueContext {
  email: string;
  password: string;
}

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly issueTokens: IssueTokensService,
  ) {}

  async execute(input: SignInInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Mensagem genérica: não revela se o e-mail existe (evita enumeração).
    if (!user || !user.canAuthenticateWithPassword) {
      throw new InvalidCredentialsError();
    }

    const passwordOk = await this.hasher.verify(user.passwordHash as string, input.password);
    if (!passwordOk) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    const tokens = await this.issueTokens.issue(user, {
      userAgent: input.userAgent,
      ip: input.ip,
    });

    return {
      user: user.toPublic(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
