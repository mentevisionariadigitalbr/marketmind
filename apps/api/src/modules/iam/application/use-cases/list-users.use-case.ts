import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository, UserSummary } from '../../domain/ports/user.repository';

/** Lista os membros da empresa (tela de Equipe). */
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(input: { companyId: string }): Promise<UserSummary[]> {
    return this.users.listByCompany(input.companyId);
  }
}
