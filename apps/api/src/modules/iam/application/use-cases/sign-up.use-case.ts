import { Inject, Injectable } from '@nestjs/common';
import { Email } from '../../domain/value-objects/email.vo';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/ports/company.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { UNIT_OF_WORK, UnitOfWork } from '../../domain/ports/unit-of-work.port';
import { RBAC_REPOSITORY, RbacRepository } from '../../domain/ports/rbac.repository';
import { SYSTEM_ROLES } from '../../domain/permissions';
import { IssueTokensService, IssueContext } from '../services/issue-tokens.service';
import { AuthResult } from '../dto/auth-result';
import { EmailAlreadyInUseError, ValidationError } from '../errors';

export interface SignUpInput extends IssueContext {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
    private readonly issueTokens: IssueTokensService,
  ) {}

  async execute(input: SignUpInput): Promise<AuthResult> {
    const email = Email.create(input.email).value;

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }
    if (!input.companyName?.trim()) {
      throw new ValidationError('O nome da empresa é obrigatório.');
    }

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.hasher.hash(input.password);

    const user = await this.uow.runInTransaction(async () => {
      const company = await this.companies.create({ name: input.companyName.trim() });
      const created = await this.users.create({
        companyId: company.id,
        name: input.name.trim(),
        email,
        passwordHash,
        role: 'OWNER',
      });
      // Quem cria a empresa é o dono: recebe o papel de sistema OWNER (RBAC).
      await this.rbac.assignSystemRole(created.id, SYSTEM_ROLES.OWNER);
      return created;
    });

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
