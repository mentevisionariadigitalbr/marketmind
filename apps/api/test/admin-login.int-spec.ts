import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@marketmind/kernel';
import { PrismaPlatformAdminRepository } from '../src/modules/admin/infrastructure/prisma-platform-admin.repository';
import { JwtAdminTokenService } from '../src/modules/admin/infrastructure/jwt-admin-token.service';
import { AdminLoginUseCase } from '../src/modules/admin/application/admin-login.use-case';
import { Argon2PasswordHasher } from '../src/modules/iam/infrastructure/security/argon2-password-hasher';
import { InvalidCredentialsError } from '../src/modules/iam/application/errors';

/**
 * Integration (Fase 7, Inc.1): login do super-admin contra `platform_admins` +
 * round-trip do token de admin (segredo próprio).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const EMAIL = 'admin.int@marketmind.ai';
const PASSWORD = 'super-secret-1';

function config(): ConfigService {
  return { get: (k: string) => ({ JWT_ADMIN_SECRET: 'admin-secret-32-bytes-minimum-xxxx', JWT_ADMIN_TTL: '1h' })[k] } as unknown as ConfigService;
}

describe('Admin login (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let useCase: AdminLoginUseCase;
  let tokens: JwtAdminTokenService;
  let adminId: string;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await owner.platformAdmin.deleteMany({ where: { email: EMAIL } });
    const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD);
    const created = await owner.platformAdmin.create({ data: { email: EMAIL, name: 'Admin Int', passwordHash } });
    adminId = created.id;

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    tokens = new JwtAdminTokenService(new JwtService({}), config());
    useCase = new AdminLoginUseCase(new PrismaPlatformAdminRepository(prisma), new Argon2PasswordHasher(), tokens);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.platformAdmin.deleteMany({ where: { email: EMAIL } });
    await owner.$disconnect();
  });

  it('autentica e emite um token de admin verificável', async () => {
    const res = await useCase.execute({ email: EMAIL, password: PASSWORD });
    const claims = await tokens.verify(res.accessToken);
    expect(claims.sub).toBe(adminId);
    expect(claims.scope).toBe('platform');
    expect(claims.email).toBe(EMAIL);

    const row = await owner.platformAdmin.findUnique({ where: { id: adminId } });
    expect(row?.lastLoginAt).not.toBeNull();
  });

  it('rejeita senha inválida', async () => {
    await expect(useCase.execute({ email: EMAIL, password: 'errada' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
