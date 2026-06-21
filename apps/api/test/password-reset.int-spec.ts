import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaUserRepository } from '../src/modules/iam/infrastructure/persistence/prisma-user.repository';
import { PrismaUserTokenRepository } from '../src/modules/iam/infrastructure/persistence/prisma-user-token.repository';
import { PrismaRefreshTokenRepository } from '../src/modules/iam/infrastructure/persistence/prisma-refresh-token.repository';
import { ForgotPasswordUseCase } from '../src/modules/iam/application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../src/modules/iam/application/use-cases/reset-password.use-case';
import { FakeTokenService, FakePasswordHasher } from '../src/modules/iam/application/__fixtures__/in-memory.fixture';
import { NoopEmailSender } from '../src/shared/mail/noop-email-sender';
import { InvalidResetTokenError } from '../src/modules/iam/application/errors';

/**
 * Integration (Fase 4, Inc.2): recuperação de senha contra Postgres real.
 * Critérios de aceite: forgot não revela cadastro; reset redefine a senha,
 * invalida o token após uso (uso único) e tokens expirados são rejeitados.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'b8b8b8b8-2222-2222-2222-222222222222';
const USER_ID = 'b8b8b8b8-2222-2222-2222-2222222222a1';
const RESET_BASE = 'http://app/reset-password';

/** Extrai o token cru do link presente no e-mail enviado. */
function tokenFromEmail(email: NoopEmailSender): string {
  const last = email.sent[email.sent.length - 1];
  const match = (last?.text ?? '').match(/token=([^\s"&)]+)/);
  if (!match) throw new Error('token não encontrado no e-mail');
  return match[1];
}

describe('Password reset — forgot/reset (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let users: PrismaUserRepository;
  let userTokens: PrismaUserTokenRepository;
  let refreshTokens: PrismaRefreshTokenRepository;
  let tokens: FakeTokenService;
  let forgot: ForgotPasswordUseCase;
  let reset: ResetPasswordUseCase;

  const clean = async () => {
    await owner.$executeRawUnsafe(`DELETE FROM user_tokens WHERE company_id = '${COMPANY}'`);
    await owner.refreshToken.deleteMany({ where: { userId: USER_ID } });
    await owner.user.deleteMany({ where: { companyId: COMPANY } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.company.create({ data: { id: COMPANY, name: 'Co Reset' } });
    await owner.user.create({
      data: { id: USER_ID, companyId: COMPANY, name: 'Ana', email: 'ana@reset.com', passwordHash: 'hashed:old-pass', status: 'ACTIVE' },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    users = new PrismaUserRepository(prisma);
    userTokens = new PrismaUserTokenRepository(prisma);
    refreshTokens = new PrismaRefreshTokenRepository(prisma);
    tokens = new FakeTokenService();
    forgot = new ForgotPasswordUseCase(users, userTokens, tokens, new NoopEmailSender());
    reset = new ResetPasswordUseCase(users, userTokens, tokens, new FakePasswordHasher(), refreshTokens);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.$disconnect();
  });

  beforeEach(async () => {
    await owner.$executeRawUnsafe(`DELETE FROM user_tokens WHERE company_id = '${COMPANY}'`);
    await owner.refreshToken.deleteMany({ where: { userId: USER_ID } });
    await owner.user.update({ where: { id: USER_ID }, data: { passwordHash: 'hashed:old-pass' } });
  });

  it('forgot grava um token para usuário existente', async () => {
    const email = new NoopEmailSender();
    const uc = new ForgotPasswordUseCase(users, userTokens, tokens, email);
    await uc.execute({ email: 'ana@reset.com', resetUrlBase: RESET_BASE });

    const rows = await owner.userToken.findMany({ where: { companyId: COMPANY, type: 'PASSWORD_RESET' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].usedAt).toBeNull();
    expect(email.sent).toHaveLength(1);
  });

  it('não revela cadastro: e-mail inexistente não grava token nem envia', async () => {
    const email = new NoopEmailSender();
    const uc = new ForgotPasswordUseCase(users, userTokens, tokens, email);
    await uc.execute({ email: 'naoexiste@reset.com', resetUrlBase: RESET_BASE });

    const rows = await owner.userToken.findMany({ where: { companyId: COMPANY } });
    expect(rows).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it('reset redefine a senha, marca o token como usado e revoga sessões', async () => {
    await refreshTokens.create({ userId: USER_ID, tokenHash: `rt-${Date.now()}`, expiresAt: new Date(Date.now() + 1e6) });
    const email = new NoopEmailSender();
    const uc = new ForgotPasswordUseCase(users, userTokens, tokens, email);
    await uc.execute({ email: 'ana@reset.com', resetUrlBase: RESET_BASE });
    const raw = tokenFromEmail(email);

    await reset.execute({ token: raw, password: 'new-strong-pass' });

    const user = await owner.user.findUnique({ where: { id: USER_ID } });
    expect(user?.passwordHash).toBe('hashed:new-strong-pass');

    const token = await owner.userToken.findFirst({ where: { companyId: COMPANY } });
    expect(token?.usedAt).not.toBeNull();

    const sessions = await owner.refreshToken.findMany({ where: { userId: USER_ID } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it('uso único: o token não pode ser reutilizado', async () => {
    const email = new NoopEmailSender();
    const uc = new ForgotPasswordUseCase(users, userTokens, tokens, email);
    await uc.execute({ email: 'ana@reset.com', resetUrlBase: RESET_BASE });
    const raw = tokenFromEmail(email);

    await reset.execute({ token: raw, password: 'new-strong-pass' });
    await expect(reset.execute({ token: raw, password: 'other-pass-1' })).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it('token expirado é rejeitado', async () => {
    await userTokens.issue({
      userId: USER_ID,
      companyId: COMPANY,
      type: 'PASSWORD_RESET',
      tokenHash: tokens.hashToken('expired-raw'),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(reset.execute({ token: 'expired-raw', password: 'new-strong-pass' })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });
});
