import { Inject, Injectable } from '@nestjs/common';
import { TOKEN_SERVICE, TokenService } from '../../iam/domain/ports/token-service.port';
import { SYSTEM_ROLE_PERMISSIONS, SYSTEM_ROLES } from '../../iam/domain/permissions';
import { NotFoundError } from '../../iam/application/errors';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../shared/audit/audit-log.repository';
import {
  ADMIN_IMPERSONATION_REPOSITORY,
  AdminImpersonationRepository,
} from '../domain/ports/admin-impersonation.repository';

export interface ImpersonateInput {
  adminId: string;
  companyId: string;
  ip: string | null;
  userAgent: string | null;
}

export interface ImpersonateResult {
  accessToken: string;
  target: { companyId: string; userId: string; email: string; companyName: string };
}

/**
 * "Entrar como cliente" — SOMENTE LEITURA e AUDITADO. Emite um token de tenant para
 * o OWNER da empresa, marcado `readOnly` + `impersonatedBy` (o app do cliente
 * funciona, mas escrita é bloqueada pelo interceptor). Registra quem entrou como
 * quem e quando.
 */
@Injectable()
export class ImpersonateCompanyUseCase {
  constructor(
    @Inject(ADMIN_IMPERSONATION_REPOSITORY) private readonly repo: AdminImpersonationRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly audit: AuditLogRepository,
  ) {}

  async execute(input: ImpersonateInput): Promise<ImpersonateResult> {
    const target = await this.repo.findCompanyOwner(input.companyId);
    if (!target) {
      throw new NotFoundError('Empresa ou usuário ativo');
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: target.userId,
      companyId: input.companyId,
      role: SYSTEM_ROLES.OWNER,
      roles: [SYSTEM_ROLES.OWNER],
      permissions: [...SYSTEM_ROLE_PERMISSIONS.OWNER],
      email: target.email,
      impersonatedBy: input.adminId,
      readOnly: true,
    });

    // Registro auditável: quem (admin) entrou como quem (company/user) e quando.
    await this.audit.record({
      companyId: input.companyId,
      userId: input.adminId,
      action: 'admin.impersonate',
      method: 'POST',
      path: `/admin/companies/${input.companyId}/impersonate`,
      statusCode: 200,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { impersonatedUserId: target.userId, readOnly: true },
    });

    return {
      accessToken,
      target: { companyId: input.companyId, userId: target.userId, email: target.email, companyName: target.companyName },
    };
  }
}
