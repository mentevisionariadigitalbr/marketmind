import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { RBAC_REPOSITORY, RbacRepository } from '../../domain/ports/rbac.repository';
import { REFRESH_TTL_MS } from '../config-tokens';

export interface IssueContext {
  userAgent?: string | null;
  ip?: string | null;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
}

/**
 * Emite par de tokens (access JWT + refresh opaco) e persiste o hash do refresh.
 * Reutilizado por sign-up, sign-in e refresh para evitar duplicação.
 */
@Injectable()
export class IssueTokensService {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(REFRESH_TTL_MS) private readonly refreshTtlMs: number,
    @Inject(RBAC_REPOSITORY) private readonly rbac: RbacRepository,
  ) {}

  async issue(user: User, ctx: IssueContext = {}): Promise<IssuedTokens> {
    const authz = await this.rbac.getEffectiveAuthorization(user.id);
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      companyId: user.companyId,
      role: authz.roles[0] ?? user.role,
      roles: authz.roles,
      permissions: authz.permissions,
      email: user.email,
    });

    const refreshToken = this.tokens.generateRefreshToken();
    const tokenHash = this.tokens.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);

    const record = await this.refreshTokens.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
    });

    return { accessToken, refreshToken, refreshTokenId: record.id, expiresAt };
  }
}
