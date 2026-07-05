import { RequestEmailVerificationUseCase } from './request-email-verification.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';
import {
  InMemoryUserRepository,
  InMemoryUserTokenRepository,
  FakeTokenService,
} from '../__fixtures__/in-memory.fixture';
import { NoopEmailSender } from '../../../../shared/mail/noop-email-sender';
import { InvalidVerificationTokenError } from '../errors';

async function setup() {
  const users = new InMemoryUserRepository();
  const userTokens = new InMemoryUserTokenRepository();
  const tokens = new FakeTokenService();
  const email = new NoopEmailSender();

  const request = new RequestEmailVerificationUseCase(users, userTokens, tokens, email);
  const verify = new VerifyEmailUseCase(users, userTokens, tokens);

  const user = await users.create({ companyId: 'c', name: 'Ana', email: 'ana@a.com', passwordHash: 'h' });
  return { request, verify, users, userTokens, tokens, email, user };
}

function tokenFromEmail(email: NoopEmailSender): string {
  const last = email.sent[email.sent.length - 1];
  const match = (last?.text ?? '').match(/token=([^\s"&)]+)/);
  if (!match) throw new Error('token não encontrado no e-mail');
  return match[1];
}

describe('RequestEmailVerificationUseCase', () => {
  it('emite token EMAIL_VERIFICATION e envia o e-mail', async () => {
    const { request, userTokens, email, user } = await setup();
    await request.execute({ userId: user.id, verifyUrlBase: 'http://app/verify-email' });

    expect(userTokens.tokens).toHaveLength(1);
    expect(userTokens.tokens[0].type).toBe('EMAIL_VERIFICATION');
    expect(email.sent[0].to).toBe('ana@a.com');
    expect(email.sent[0].text).toContain('http://app/verify-email?token=');
  });

  it('no-op se o usuário já estiver verificado', async () => {
    const { request, verify, userTokens, email, user } = await setup();
    await request.execute({ userId: user.id, verifyUrlBase: 'http://app/verify-email' });
    await verify.execute({ token: tokenFromEmail(email) });

    await request.execute({ userId: user.id, verifyUrlBase: 'http://app/verify-email' });
    // não emite novo token nem envia novo e-mail
    expect(userTokens.tokens.filter((t) => t.usedAt === null)).toHaveLength(0);
    expect(email.sent).toHaveLength(1);
  });

  it('no-op se o usuário não existir', async () => {
    const { request, userTokens, email } = await setup();
    await request.execute({ userId: 'inexistente', verifyUrlBase: 'http://app/verify-email' });
    expect(userTokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });
});

describe('VerifyEmailUseCase', () => {
  it('marca o e-mail como verificado com token válido', async () => {
    const { request, verify, users, email, user } = await setup();
    await request.execute({ userId: user.id, verifyUrlBase: 'http://app/verify-email' });

    await verify.execute({ token: tokenFromEmail(email) });

    const updated = await users.findById(user.id);
    expect(updated?.isEmailVerified).toBe(true);
  });

  it('uso único: o token não pode ser reutilizado', async () => {
    const { request, verify, email, user } = await setup();
    await request.execute({ userId: user.id, verifyUrlBase: 'http://app/verify-email' });
    const raw = tokenFromEmail(email);

    await verify.execute({ token: raw });
    await expect(verify.execute({ token: raw })).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it('token expirado é rejeitado', async () => {
    const { verify, userTokens, tokens, user } = await setup();
    await userTokens.issue({
      userId: user.id,
      companyId: 'c',
      type: 'EMAIL_VERIFICATION',
      tokenHash: tokens.hashToken('raw-expired'),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(verify.execute({ token: 'raw-expired' })).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it('token inexistente é rejeitado', async () => {
    const { verify } = await setup();
    await expect(verify.execute({ token: 'nope' })).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });
});
