import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AccessClaims, TokenService } from '../../domain/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(claims: AccessClaims): Promise<string> {
    const options: JwtSignOptions = {
      subject: claims.sub,
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      // jsonwebtoken aceita "15m"/"7d" em runtime; o tipo é mais restrito.
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
        '15m') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.signAsync(
      {
        companyId: claims.companyId,
        role: claims.role,
        roles: claims.roles,
        permissions: claims.permissions,
        email: claims.email,
        // Só presentes em tokens de impersonação (somente leitura).
        ...(claims.impersonatedBy ? { impersonatedBy: claims.impersonatedBy } : {}),
        ...(claims.readOnly ? { readOnly: true } : {}),
      },
      options,
    );
  }

  async verifyAccessToken(token: string): Promise<AccessClaims> {
    const payload = await this.jwt.verifyAsync<{
      sub: string;
      companyId: string;
      role: string;
      roles?: string[];
      permissions?: string[];
      email: string;
      impersonatedBy?: string;
      readOnly?: boolean;
    }>(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET') });
    return {
      sub: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      email: payload.email,
      impersonatedBy: payload.impersonatedBy,
      readOnly: payload.readOnly,
    };
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
