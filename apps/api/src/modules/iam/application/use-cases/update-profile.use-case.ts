import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';

/** Atualiza o perfil do próprio usuário (nome). */
@Injectable()
export class UpdateProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: { userId: string; name: string }) {
    const user = await this.users.updateProfile(input.userId, { name: input.name });
    return user.toPublic();
  }
}
