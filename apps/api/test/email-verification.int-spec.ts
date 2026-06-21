import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaUserRepository } from '../src/modules/iam/infrastructure/persistence/prisma-user.repository';
import { PrismaUserTokenRepository } from '../src/modules/iam/infrastructure/persistence/prisma-user-token.repository';
import { RequestEmailVerificationUseCase } from '../src/modules/iam/application/use-cases/request-email-verification.use-case';
import { VerifyEmailUseCase } from '../src/modules/iam/application/use-cases/verify-email.use-case';
import { FakeTokenService } from '../src/modules/iam/application/__fixtures__/in-memory.fixture';
import { NoopEmailSender } from '../src/shared/mail/noop-email-sender';
import { InvalidVerificationTokenError } from '../src/modules/iam/application/errors';

/**
 * Integration (Fase 4, Inc.3): verificação de e-mail contra Postgres real.
 * Critérios: request emite token; verify grava email_verified_at; token é de
 * uso único; usuário já verificado não recebe novo token.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'c7c7c7c7-3333-3333-3333-333333333333';
const USER_ID = 'c7c7c7c7-3333-3333-3333-3333333333a1';
const VERIFY_BASE = 'http://app/verify-email';

function tokenFromEmail(email: NoopEmailSender): string {
  const last = email.sent[email.sent.length - 1];
  const match = (last?.text ?? '').match(/token=([^\s"&)]+)/);
  if (!match) throw new Error('token não encontrado no e-mail');
  return match[1];
}

describe('Email verification — request/verify (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let users: PrismaUserRepository;
  let userTokens: PrismaUserTokenRepository;
  let tokens: FakeTokenService;
  let verify: VerifyEmailUseCase;

  const clean = async () => {
    await owner.$executeRawUnsafe(`DELETE FROM user_tokens WHERE company_id = '${COMPANY}'`);
    await owner.user.deleteMany({ where: { companyId: COMPANY } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.company.create({ data: { id: COMPANY, name: 'Co Verify' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    users = new PrismaUserRepository(prisma);
    userTokens = new PrismaUserTokenRepository(prisma);
    tokens = new FakeTokenService();
    verify = new VerifyEmailUseCase(users, userTokens, tokens);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.$disconnect();
  });

  beforeEach(async () => {
    await owner.$executeRawUnsafe(`DELETE FROM user_tokens WHERE company_id = '${COMPANY}'`);
    await owner.user.deleteMany({ where: { companyId: COMPANY } });
    await owner.user.create({
      data: { id: USER_ID, companyId: COMPANY, name: 'Ana', email: 'ana@verify.com', passwordHash: 'h', status: 'ACTIVE' },
    });
  });

  it('request emite token EMAIL_VERIFICATION e verify grava email_verified_at', async () => {
    const email = new NoopEmailSender();
    const request = new RequestEmailVerificationUseCase(users, userTokens, tokens, email);
    await request.execute({ userId: USER_ID, verifyUrlBase: VERIFY_BASE });

    const rows = await owner.userToken.findMany({ where: { companyId: COMPANY, type: 'EMAIL_VERIFICATION' } });
    expect(rows).toHaveLength(1);

    await verify.execute({ token: tokenFromEmail(email) });

    const user = await owner.user.findUnique({ where: { id: USER_ID } });
    expect(user?.emailVerifiedAt).not.toBeNull();
  });

  it('uso único: o token de verificação não pode ser reutilizado', async () => {
    const email = new NoopEmailSender();
    const request = new RequestEmailVerificationUseCase(users, userTokens, tokens, email);
    await request.execute({ userId: USER_ID, verifyUrlBase: VERIFY_BASE });
    const raw = tokenFromEmail(email);

    await verify.execute({ token: raw });
    await expect(verify.execute({ token: raw })).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it('usuário já verificado não recebe novo token', async () => {
    await owner.user.update({ where: { id: USER_ID }, data: { emailVerifiedAt: new Date() } });
    const email = new NoopEmailSender();
    const request = new RequestEmailVerificationUseCase(users, userTokens, tokens, email);
    await request.execute({ userId: USER_ID, verifyUrlBase: VERIFY_BASE });

    const rows = await owner.userToken.findMany({ where: { companyId: COMPANY } });
    expect(rows).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });
});
