import { Inject, Injectable } from '@nestjs/common';
import { Email } from '../../domain/value-objects/email.vo';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { UNIT_OF_WORK, UnitOfWork } from '../../domain/ports/unit-of-work.port';
import { RBAC_REPOSITORY, RbacRepository } from '../../domain/ports/rbac.repository';
import { UserRole } from '../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../errors';

export type InvitableRole = 'OWNER' | 'ADMIN' | 'MEMBER';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface InviteMemberInput {
  companyId: string;
  email: string;
  name: string;
  role: InvitableRole;
}

export interface InviteMemberResult {
  userId: string;
  email: string;
  /** Token bruto do convite (o link é montado na borda HTTP). */
  token: string;
}

/**
 * Convida um membro: cria o usuário INVITED (sem senha), atribui o papel (RBAC +
 * legacy) e gera um token de convite. O link é compartilhado pelo admin; o membro
 * define a própria senha em /accept-invite.
 */
@Injectable()
export class InviteMemberUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberResult> {
    const email = Email.create(input.email).value;
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }

    const rawToken = this.tokens.generateRefreshToken();
    const tokenHash = this.tokens.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const userId = await this.uow.runInTransaction(async () => {
      const user = await this.users.create({
        companyId: input.companyId,
        name: input.name.trim(),
        email,
        role: input.role as UserRole,
        status: 'INVITED',
      });
      await this.rbac.setSystemRole(user.id, input.role);
      await this.users.setInvite(user.id, tokenHash, expiresAt);
      return user.id;
    });

    return { userId, email, token: rawToken };
  }
}
