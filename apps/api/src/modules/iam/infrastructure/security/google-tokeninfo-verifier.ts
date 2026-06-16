import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile, GoogleVerifier } from '../../domain/ports/google-verifier.port';
import { ValidationError } from '../../application/errors';

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  error?: string;
  error_description?: string;
}

/**
 * Valida o ID token do Google pelo endpoint oficial `tokeninfo` (fetch nativo do
 * Node 20 — sem dependências extras). Confere a audiência contra GOOGLE_CLIENT_ID.
 *
 * Para produção em alta escala, trocar por verificação local de assinatura
 * (JWKS / google-auth-library) é recomendado — basta substituir este adapter,
 * pois o caso de uso depende apenas da porta GoogleVerifier.
 */
@Injectable()
export class GoogleTokenInfoVerifier implements GoogleVerifier {
  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    if (!idToken?.trim()) {
      throw new ValidationError('idToken do Google ausente.');
    }

    let info: GoogleTokenInfo;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      info = (await res.json()) as GoogleTokenInfo;
      if (!res.ok) {
        throw new Error(info.error_description ?? info.error ?? `HTTP ${res.status}`);
      }
    } catch {
      throw new ValidationError('Falha ao validar o token do Google.');
    }

    if (info.error || !info.sub || !info.email) {
      throw new ValidationError('Token do Google inválido.');
    }

    const expectedAud = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (expectedAud && info.aud !== expectedAud) {
      throw new ValidationError('Token do Google emitido para outro aplicativo.');
    }

    return {
      googleId: info.sub,
      email: info.email,
      name: info.name ?? info.email.split('@')[0],
      emailVerified: info.email_verified === true || info.email_verified === 'true',
    };
  }
}
