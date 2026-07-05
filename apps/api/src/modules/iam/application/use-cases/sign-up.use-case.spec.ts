import { SignUpUseCase } from './sign-up.use-case';
import { IssueTokensService } from '../services/issue-tokens.service';
import { RequestEmailVerificationUseCase } from './request-email-verification.use-case';
import { RecordLegalAcceptanceService } from '../../../legal/application/record-legal-acceptance.service';
import { EmailAlreadyInUseError, ValidationError } from '../errors';
import {
  FakePasswordHasher,
  FakeTokenService,
  FakeUnitOfWork,
  InMemoryCompanyRepository,
  InMemoryLegalAcceptanceRepository,
  InMemoryRbacRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  InMemoryUserTokenRepository,
} from '../__fixtures__/in-memory.fixture';
import { NoopEmailSender } from '../../../../shared/mail/noop-email-sender';

describe('SignUpUseCase', () => {
  let companies: InMemoryCompanyRepository;
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let userTokens: InMemoryUserTokenRepository;
  let rbac: InMemoryRbacRepository;
  let email: NoopEmailSender;
  let legal: InMemoryLegalAcceptanceRepository;
  let useCase: SignUpUseCase;

  beforeEach(() => {
    companies = new InMemoryCompanyRepository();
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    userTokens = new InMemoryUserTokenRepository();
    rbac = new InMemoryRbacRepository();
    email = new NoopEmailSender();
    legal = new InMemoryLegalAcceptanceRepository();
    const tokens = new FakeTokenService();
    const issueTokens = new IssueTokensService(tokens, refreshTokens, 7 * 24 * 60 * 60 * 1000, rbac);
    const requestVerification = new RequestEmailVerificationUseCase(users, userTokens, tokens, email);
    useCase = new SignUpUseCase(
      new FakeUnitOfWork(),
      companies,
      users,
      new FakePasswordHasher(),
      rbac,
      issueTokens,
      requestVerification,
      new RecordLegalAcceptanceService(legal),
    );
  });

  const validInput = {
    companyName: 'Loja do Ricardo',
    name: 'Ricardo',
    email: 'Ricardo@Example.com',
    password: 'SenhaForte1',
    acceptedTerms: true,
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
    // aceite versionado de Termos + Privacidade registrado
    expect(await legal.listForUser(result.user.id)).toHaveLength(2);
  });

  it('rejeita cadastro sem aceite dos Termos/Privacidade', async () => {
    await expect(
      useCase.execute({ ...validInput, acceptedTerms: false }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(companies.items).toHaveLength(0);
    expect(users.items).toHaveLength(0);
  });

  it('envia verificação de e-mail quando verifyUrlBase é informado', async () => {
    await useCase.execute({ ...validInput, verifyUrlBase: 'http://app/verify-email' });
    expect(userTokens.tokens).toHaveLength(1);
    expect(userTokens.tokens[0].type).toBe('EMAIL_VERIFICATION');
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].text).toContain('http://app/verify-email?token=');
  });

  it('não envia verificação sem verifyUrlBase (não-bloqueante)', async () => {
    await useCase.execute(validInput);
    expect(userTokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
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
