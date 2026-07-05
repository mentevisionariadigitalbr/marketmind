import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { InvalidCredentialsError } from '../errors';

/** Troca a senha do próprio usuário: valida a senha atual e grava o novo hash. */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: { userId: string; currentPassword: string; newPassword: string }): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user || !user.canAuthenticateWithPassword) {
      throw new InvalidCredentialsError();
    }
    const ok = await this.hasher.verify(user.passwordHash as string, input.currentPassword);
    if (!ok) {
      throw new InvalidCredentialsError();
    }
    const hash = await this.hasher.hash(input.newPassword);
    await this.users.updatePassword(user.id, hash);
  }
}
