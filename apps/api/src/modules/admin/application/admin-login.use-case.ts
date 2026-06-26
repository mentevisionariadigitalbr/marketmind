import { Inject, Injectable } from '@nestjs/common';
import {
  PLATFORM_ADMIN_REPOSITORY,
  PlatformAdminRepository,
} from '../domain/ports/platform-admin.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../iam/domain/ports/password-hasher.port';
import { ADMIN_TOKEN_SERVICE, AdminTokenService } from '../domain/ports/admin-token.service';
import { InvalidCredentialsError } from '../../iam/application/errors';

export interface AdminLoginResult {
  accessToken: string;
  admin: { id: string; email: string; name: string };
}

/** Autentica o super-admin de plataforma e emite um token de admin (segredo próprio). */
@Injectable()
export class AdminLoginUseCase {
  constructor(
    @Inject(PLATFORM_ADMIN_REPOSITORY) private readonly admins: PlatformAdminRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ADMIN_TOKEN_SERVICE) private readonly tokens: AdminTokenService,
  ) {}

  async execute(input: { email: string; password: string }): Promise<AdminLoginResult> {
    const email = input.email.trim().toLowerCase();
    const admin = await this.admins.findByEmail(email);
    // Mesma resposta para inexistente/senha errada (não revela cadastro).
    if (!admin || !(await this.hasher.verify(admin.passwordHash, input.password))) {
      throw new InvalidCredentialsError();
    }
    await this.admins.touchLastLogin(admin.id);
    const accessToken = await this.tokens.sign({ sub: admin.id, scope: 'platform', email: admin.email });
    return { accessToken, admin: { id: admin.id, email: admin.email, name: admin.name } };
  }
}
