import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_VERIFIER, GoogleVerifier } from '../../domain/ports/google-verifier.port';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/ports/company.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { UNIT_OF_WORK, UnitOfWork } from '../../domain/ports/unit-of-work.port';
import { RBAC_REPOSITORY, RbacRepository } from '../../domain/ports/rbac.repository';
import { SYSTEM_ROLES } from '../../domain/permissions';
import { User } from '../../domain/entities/user.entity';
import { IssueTokensService, IssueContext } from '../services/issue-tokens.service';
import { RecordLegalAcceptanceService } from '../../../legal/application/record-legal-acceptance.service';
import { AuthResult } from '../dto/auth-result';
import { ValidationError } from '../errors';

export interface GoogleSignInInput extends IssueContext {
  idToken: string;
  /** Aceite legal — exigido apenas quando o login do Google cria um usuário novo. */
  acceptedTerms?: boolean;
}

@Injectable()
export class GoogleSignInUseCase {
  constructor(
    @Inject(GOOGLE_VERIFIER) private readonly google: GoogleVerifier,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
    private readonly issueTokens: IssueTokensService,
    private readonly recordLegalAcceptance: RecordLegalAcceptanceService,
  ) {}

  async execute(input: GoogleSignInInput): Promise<AuthResult> {
    const profile = await this.google.verify(input.idToken);
    if (!profile.emailVerified) {
      throw new ValidationError('E-mail do Google não verificado.');
    }
    const email = profile.email.trim().toLowerCase();
    const name = profile.name?.trim() || email.split('@')[0];

    const user = await this.resolveUser(profile.googleId, email, name, input);

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

  private async resolveUser(
    googleId: string,
    email: string,
    name: string,
    ctx: GoogleSignInInput,
  ): Promise<User> {
    // 1. Já existe conta vinculada ao Google → login direto.
    const byGoogle = await this.users.findByGoogleId(googleId);
    if (byGoogle) {
      return byGoogle;
    }

    // 2. Existe usuário com o mesmo e-mail (cadastro por senha) → vincula o Google.
    const byEmail = await this.users.findByEmail(email);
    if (byEmail) {
      return this.users.attachGoogleId(byEmail.id, googleId);
    }

    // 3. Primeiro acesso → cadastro automático: exige aceite legal versionado.
    if (!ctx.acceptedTerms) {
      throw new ValidationError('É necessário aceitar os Termos de Uso e a Política de Privacidade.');
    }
    return this.uow.runInTransaction(async () => {
      const company = await this.companies.create({ name: `Empresa de ${name}` });
      const created = await this.users.create({
        companyId: company.id,
        name,
        email,
        googleId,
        role: 'OWNER',
      });
      await this.rbac.assignSystemRole(created.id, SYSTEM_ROLES.OWNER);
      await this.recordLegalAcceptance.acceptAll({
        userId: created.id,
        companyId: company.id,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      });
      return created;
    });
  }
}
