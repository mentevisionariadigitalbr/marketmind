import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import {
  InMemoryUserRepository,
  InMemoryUserTokenRepository,
  InMemoryRefreshTokenRepository,
  FakeTokenService,
  FakePasswordHasher,
} from '../__fixtures__/in-memory.fixture';
import { NoopEmailSender } from '../../../../shared/mail/noop-email-sender';
import { InvalidResetTokenError, ValidationError } from '../errors';

async function setup() {
  const users = new InMemoryUserRepository();
  const userTokens = new InMemoryUserTokenRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const tokens = new FakeTokenService();
  const hasher = new FakePasswordHasher();
  const email = new NoopEmailSender();

  const forgot = new ForgotPasswordUseCase(users, userTokens, tokens, email);
  const reset = new ResetPasswordUseCase(users, userTokens, tokens, hasher, refreshTokens);

  const user = await users.create({ companyId: 'c', name: 'Ana', email: 'ana@a.com', passwordHash: 'hashed:old-pass' });
  return { forgot, reset, users, userTokens, refreshTokens, tokens, email, user };
}

/** Extrai o token cru (rawToken) do link presente no e-mail enviado. */
function tokenFromEmail(email: NoopEmailSender): string {
  const last = email.sent[email.sent.length - 1];
  const match = (last?.text ?? '').match(/token=([^\s"&)]+)/);
  if (!match) throw new Error('token não encontrado no e-mail');
  return match[1];
}

describe('ForgotPasswordUseCase', () => {
  it('emite token e envia e-mail quando o usuário existe', async () => {
    const { forgot, userTokens, email, user } = await setup();
    await forgot.execute({ email: 'ana@a.com', resetUrlBase: 'http://app/reset-password' });

    expect(userTokens.tokens).toHaveLength(1);
    expect(userTokens.tokens[0].userId).toBe(user.id);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('ana@a.com');
    expect(email.sent[0].text).toContain('http://app/reset-password?token=');
  });

  it('não revela cadastro: e-mail inexistente não emite token nem envia (sem erro)', async () => {
    const { forgot, userTokens, email } = await setup();
    await expect(
      forgot.execute({ email: 'naoexiste@a.com', resetUrlBase: 'http://app/reset-password' }),
    ).resolves.toBeUndefined();

    expect(userTokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it('normaliza o e-mail (case/espacos) ao localizar o usuário', async () => {
    const { forgot, email } = await setup();
    await forgot.execute({ email: '  ANA@a.com ', resetUrlBase: 'http://app/reset-password' });
    expect(email.sent).toHaveLength(1);
  });
});

describe('ResetPasswordUseCase', () => {
  it('redefine a senha com token válido e revoga sessões', async () => {
    const { forgot, reset, users, refreshTokens, email, user } = await setup();
    await refreshTokens.create({ userId: user.id, tokenHash: 'rt', expiresAt: new Date(Date.now() + 1e6) });

    await forgot.execute({ email: 'ana@a.com', resetUrlBase: 'http://app/reset-password' });
    const raw = tokenFromEmail(email);

    await reset.execute({ token: raw, password: 'new-strong-pass' });

    const updated = await users.findById(user.id);
    expect(updated?.passwordHash).toBe('hashed:new-strong-pass');
    expect(refreshTokens.items.every((t) => t.revokedAt !== null)).toBe(true);
  });

  it('uso único: o mesmo token não funciona duas vezes', async () => {
    const { forgot, reset, email } = await setup();
    await forgot.execute({ email: 'ana@a.com', resetUrlBase: 'http://app/reset-password' });
    const raw = tokenFromEmail(email);

    await reset.execute({ token: raw, password: 'new-strong-pass' });
    await expect(reset.execute({ token: raw, password: 'another-pass' })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('token expirado é rejeitado', async () => {
    const { reset, userTokens, tokens, user } = await setup();
    await userTokens.issue({
      userId: user.id,
      companyId: 'c',
      type: 'PASSWORD_RESET',
      tokenHash: tokens.hashToken('raw-expired'),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(reset.execute({ token: 'raw-expired', password: 'new-strong-pass' })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('token inexistente é rejeitado', async () => {
    const { reset } = await setup();
    await expect(reset.execute({ token: 'nope', password: 'new-strong-pass' })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('senha curta é rejeitada (sem consumir token)', async () => {
    const { reset, userTokens } = await setup();
    await expect(reset.execute({ token: 'whatever', password: 'short' })).rejects.toBeInstanceOf(ValidationError);
    expect(userTokens.tokens).toHaveLength(0);
  });
});
