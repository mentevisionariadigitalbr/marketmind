import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { RBAC_REPOSITORY, RbacRepository } from '../../domain/ports/rbac.repository';
import { UserRole } from '../../domain/entities/user.entity';
import { NotFoundError } from '../errors';
import { InvitableRole } from './invite-member.use-case';

/** Define o papel de um membro (RBAC + legacy). Valida que o alvo é da mesma empresa. */
@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
  ) {}

  async execute(input: { companyId: string; userId: string; role: InvitableRole }): Promise<void> {
    const target = await this.users.findById(input.userId);
    if (!target || target.companyId !== input.companyId) {
      throw new NotFoundError('Usuário');
    }
    await this.rbac.setSystemRole(input.userId, input.role);
    await this.users.updateRole(input.userId, input.role as UserRole);
  }
}
