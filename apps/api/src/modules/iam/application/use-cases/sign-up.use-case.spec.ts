import { SignUpUseCase } from './sign-up.use-case';
import { IssueTokensService } from '../services/issue-tokens.service';
import { EmailAlreadyInUseError, ValidationError } from '../errors';
import {
  FakePasswordHasher,
  FakeTokenService,
  FakeUnitOfWork,
  InMemoryCompanyRepository,
  InMemoryRbacRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../__fixtures__/in-memory.fixture';

describe('SignUpUseCase', () => {
  let companies: InMemoryCompanyRepository;
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let rbac: InMemoryRbacRepository;
  let useCase: SignUpUseCase;

  beforeEach(() => {
    companies = new InMemoryCompanyRepository();
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    rbac = new InMemoryRbacRepository();
    const issueTokens = new IssueTokensService(
      new FakeTokenService(),
      refreshTokens,
      7 * 24 * 60 * 60 * 1000,
      rbac,
    );
    useCase = new SignUpUseCase(
      new FakeUnitOfWork(),
      companies,
      users,
      new FakePasswordHasher(),
      rbac,
      issueTokens,
    );
  });

  const validInput = {
    companyName: 'Loja do Ricardo',
    name: 'Ricardo',
    email: 'Ricardo@Example.com',
    password: 'SenhaForte1',
  };

  it('cria empresa + usuário e retorna tokens', async () => {
    const result = await useCase.execute(validInput);

    expect(companies.items).toHaveLength(1);
    expect(users.items).toHaveLength(1);
    expect(result.user.email).toBe('ricardo@example.com'); // normalizado
    expect(result.user.companyId).toBe(companies.items[0].id);
    expect(result.user.role).toBe('OWNER');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(refreshTokens.items).toHaveLength(1);
    // a resposta nunca expõe o hash de senha
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
    // o criador recebe o papel de sistema OWNER (RBAC)
    const authz = await rbac.getEffectiveAuthorization(result.user.id);
    expect(authz.roles).toContain('OWNER');
    expect(authz.permissions).toContain('iam:write');
  });

  it('rejeita e-mail já cadastrado', async () => {
    await useCase.execute(validInput);
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('rejeita senha curta', async () => {
    await expect(
      useCase.execute({ ...validInput, password: '123' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita e-mail inválido', async () => {
    await expect(
      useCase.execute({ ...validInput, email: 'sem-arroba' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
