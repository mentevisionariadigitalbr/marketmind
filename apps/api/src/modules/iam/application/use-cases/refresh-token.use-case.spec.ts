import { RefreshTokenUseCase } from './refresh-token.use-case';
import { SignInUseCase } from './sign-in.use-case';
import { IssueTokensService } from '../services/issue-tokens.service';
import { InvalidRefreshTokenError } from '../errors';
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  rbacWith,
} from '../__fixtures__/in-memory.fixture';

describe('RefreshTokenUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let tokens: FakeTokenService;
  let issueTokens: IssueTokensService;
  let signIn: SignInUseCase;
  let refresh: RefreshTokenUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    tokens = new FakeTokenService();
    issueTokens = new IssueTokensService(tokens, refreshTokens, 60_000, rbacWith());
    signIn = new SignInUseCase(users, new FakePasswordHasher(), issueTokens);
    refresh = new RefreshTokenUseCase(refreshTokens, users, tokens, issueTokens);

    await users.create({
      companyId: 'company-1',
      name: 'Ricardo',
      email: 'ricardo@example.com',
      passwordHash: 'hashed:SenhaForte1',
    });
  });

  async function login() {
    return signIn.execute({ email: 'ricardo@example.com', password: 'SenhaForte1' });
  }

  it('rotaciona o refresh token e revoga o anterior', async () => {
    const session = await login();
    const rotated = await refresh.execute({ refreshToken: session.refreshToken });

    expect(rotated.refreshToken).not.toBe(session.refreshToken);

    const oldRecord = refreshTokens.items.find(
      (t) => t.tokenHash === tokens.hashToken(session.refreshToken),
    );
    expect(oldRecord?.revokedAt).not.toBeNull();
    expect(oldRecord?.replacedByTokenId).toBeTruthy();
  });

  it('rejeita refresh token desconhecido', async () => {
    await expect(refresh.execute({ refreshToken: 'inexistente' })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it('detecta reuso: usar token antigo após rotação revoga todas as sessões', async () => {
    const session = await login();
    await refresh.execute({ refreshToken: session.refreshToken });

    // tentar reusar o token antigo (já revogado) deve falhar...
    await expect(
      refresh.execute({ refreshToken: session.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    // ...e revogar todas as sessões ativas do usuário (defesa contra roubo).
    const active = refreshTokens.items.filter((t) => !t.revokedAt);
    expect(active).toHaveLength(0);
  });
});
