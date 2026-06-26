import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AdminClaims, PLATFORM_SCOPE } from '../domain/admin-claims';
import { AdminTokenService } from '../domain/ports/admin-token.service';

/**
 * Token de admin assinado com `JWT_ADMIN_SECRET` (SEPARADO do JWT de tenant). Se o
 * segredo não estiver configurado, assinar/verificar falham — a área de admin fica
 * indisponível (default seguro: sem segredo, sem admin).
 */
@Injectable()
export class JwtAdminTokenService implements AdminTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private secret(): string {
    const secret = this.config.get<string>('JWT_ADMIN_SECRET');
    if (!secret) {
      throw new Error('JWT_ADMIN_SECRET ausente — área de admin desabilitada.');
    }
    return secret;
  }

  async sign(claims: AdminClaims): Promise<string> {
    const options: JwtSignOptions = {
      subject: claims.sub,
      secret: this.secret(),
      expiresIn: (this.config.get<string>('JWT_ADMIN_TTL') ?? '1h') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.signAsync({ scope: PLATFORM_SCOPE, email: claims.email }, options);
  }

  async verify(token: string): Promise<AdminClaims> {
    const payload = await this.jwt.verifyAsync<{ sub: string; scope?: string; email: string }>(token, {
      secret: this.secret(),
    });
    if (payload.scope !== PLATFORM_SCOPE) {
      throw new Error('Escopo de token inválido para admin.');
    }
    return { sub: payload.sub, scope: PLATFORM_SCOPE, email: payload.email };
  }
}
