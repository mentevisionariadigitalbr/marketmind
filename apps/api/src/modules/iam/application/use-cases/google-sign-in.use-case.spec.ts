import { GoogleSignInUseCase } from './google-sign-in.use-case';
import { IssueTokensService } from '../services/issue-tokens.service';
import { ValidationError } from '../errors';
import { GoogleProfile, GoogleVerifier } from '../../domain/ports/google-verifier.port';
import {
  FakeTokenService,
  FakeUnitOfWork,
  InMemoryCompanyRepository,
  InMemoryRbacRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../__fixtures__/in-memory.fixture';

class FakeGoogleVerifier implements GoogleVerifier {
  constructor(private readonly profile: GoogleProfile) {}
  async verify(): Promise<GoogleProfile> {
    return this.profile;
  }
}

const PROFILE: GoogleProfile = {
  googleId: 'google-123',
  email: 'Maria@Gmail.com',
  name: 'Maria',
  emailVerified: true,
};

function makeUseCase(profile: GoogleProfile) {
  const companies = new InMemoryCompanyRepository();
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const rbac = new InMemoryRbacRepository();
  const issueTokens = new IssueTokensService(new FakeTokenService(), refreshTokens, 60_000, rbac);
  const useCase = new GoogleSignInUseCase(
    new FakeGoogleVerifier(profile),
    new FakeUnitOfWork(),
    companies,
    users,
    rbac,
    issueTokens,
  );
  return { useCase, companies, users, rbac };
}

describe('GoogleSignInUseCase', () => {
  it('primeiro acesso: cria empresa + usuário OWNER e retorna tokens', async () => {
    const { useCase, companies, users, rbac } = makeUseCase(PROFILE);

    const result = await useCase.execute({ idToken: 'tok' });

    expect(companies.items).toHaveLength(1);
    expect(users.items).toHaveLength(1);
    expect(result.user.email).toBe('maria@gmail.com'); // normalizado
    expect(result.user.googleId).toBe('google-123');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    const authz = await rbac.getEffectiveAuthorization(result.user.id);
    expect(authz.roles).toContain('OWNER');
  });

  it('login: usuário já vinculado ao Google não cria nova empresa', async () => {
    const { useCase, companies, users } = makeUseCase(PROFILE);
    await users.create({
      companyId: 'company-x',
      name: 'Maria',
      email: 'maria@gmail.com',
      googleId: 'google-123',
    });

    const result = await useCase.execute({ idToken: 'tok' });

    expect(companies.items).toHaveLength(0); // nenhuma empresa nova
    expect(users.items).toHaveLength(1);
    expect(result.user.companyId).toBe('company-x');
  });

  it('vinculação: conta por senha com mesmo e-mail recebe o googleId', async () => {
    const { useCase, companies, users } = makeUseCase(PROFILE);
    await users.create({
      companyId: 'company-y',
      name: 'Maria',
      email: 'maria@gmail.com',
      passwordHash: 'hashed:x',
    });

    const result = await useCase.execute({ idToken: 'tok' });

    expect(companies.items).toHaveLength(0);
    expect(users.items).toHaveLength(1);
    expect(users.items[0].googleId).toBe('google-123');
    expect(result.user.companyId).toBe('company-y');
  });

  it('rejeita e-mail não verificado', async () => {
    const { useCase } = makeUseCase({ ...PROFILE, emailVerified: false });
    await expect(useCase.execute({ idToken: 'tok' })).rejects.toBeInstanceOf(ValidationError);
  });
});
