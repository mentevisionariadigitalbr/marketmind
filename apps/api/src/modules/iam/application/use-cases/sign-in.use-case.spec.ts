import { SignInUseCase } from './sign-in.use-case';
import { IssueTokensService } from '../services/issue-tokens.service';
import { InvalidCredentialsError } from '../errors';
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  rbacWith,
} from '../__fixtures__/in-memory.fixture';

describe('SignInUseCase', () => {
  let users: InMemoryUserRepository;
  let useCase: SignInUseCase;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    const issueTokens = new IssueTokensService(
      new FakeTokenService(),
      new InMemoryRefreshTokenRepository(),
      1000,
      rbacWith(),
    );
    useCase = new SignInUseCase(users, new FakePasswordHasher(), issueTokens);

    await users.create({
      companyId: 'company-1',
      name: 'Ricardo',
      email: 'ricardo@example.com',
      passwordHash: 'hashed:SenhaForte1',
    });
  });

  it('autentica com credenciais válidas', async () => {
    const result = await useCase.execute({
      email: 'Ricardo@example.com',
      password: 'SenhaForte1',
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('ricardo@example.com');
  });

  it('rejeita senha errada', async () => {
    await expect(
      useCase.execute({ email: 'ricardo@example.com', password: 'errada' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejeita e-mail inexistente com erro genérico', async () => {
    await expect(
      useCase.execute({ email: 'naoexiste@example.com', password: 'SenhaForte1' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
