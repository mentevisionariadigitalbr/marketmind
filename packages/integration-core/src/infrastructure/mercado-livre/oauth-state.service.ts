import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IntegrationNotConfiguredError } from '../../application/errors';

/**
 * Assina/valida o parâmetro `state` do OAuth (proteção CSRF + transporte do
 * companyId entre o início do fluxo e o callback público). JWT curto (10 min).
 */
@Injectable()
export class OAuthStateService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(companyId: string): string {
    return this.jwt.sign(
      { companyId, t: 'ml_oauth' },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '10m' },
    );
  }

  verify(state: string): string {
    try {
      const payload = this.jwt.verify<{ companyId: string; t: string }>(state, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.t !== 'ml_oauth' || !payload.companyId) {
        throw new Error('state inválido');
      }
      return payload.companyId;
    } catch {
      throw new IntegrationNotConfiguredError('Parâmetro state inválido ou expirado.');
    }
  }
}
