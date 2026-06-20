import { ChangePasswordUseCase } from './change-password.use-case';
import { UpdateProfileUseCase } from './update-profile.use-case';
import { UpdateCompanyUseCase } from './update-company.use-case';
import {
  InMemoryUserRepository,
  InMemoryCompanyRepository,
  FakePasswordHasher,
} from '../__fixtures__/in-memory.fixture';
import { InvalidCredentialsError } from '../errors';

describe('ChangePasswordUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const hasher = new FakePasswordHasher();
    const user = await users.create({ companyId: 'c', name: 'Ana', email: 'a@a.com', passwordHash: 'hashed:old-pass' });
    return { useCase: new ChangePasswordUseCase(users, hasher), users, user };
  }

  it('troca a senha quando a atual confere', async () => {
    const { useCase, users, user } = await setup();
    await useCase.execute({ userId: user.id, currentPassword: 'old-pass', newPassword: 'new-strong-pass' });
    const updated = await users.findById(user.id);
    expect(updated?.passwordHash).toBe('hashed:new-strong-pass');
  });

  it('rejeita se a senha atual está errada', async () => {
    const { useCase, user } = await setup();
    await expect(
      useCase.execute({ userId: user.id, currentPassword: 'wrong', newPassword: 'new-strong-pass' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe('UpdateProfileUseCase', () => {
  it('atualiza o nome do usuário', async () => {
    const users = new InMemoryUserRepository();
    const user = await users.create({ companyId: 'c', name: 'Ana', email: 'a@a.com', passwordHash: 'h' });
    const result = await new UpdateProfileUseCase(users).execute({ userId: user.id, name: 'Ana Maria' });
    expect(result.name).toBe('Ana Maria');
  });
});

describe('UpdateCompanyUseCase', () => {
  it('atualiza nome e regime tributário', async () => {
    const companies = new InMemoryCompanyRepository();
    const company = await companies.create({ name: 'Loja', taxRegime: 'SIMPLES_NACIONAL' });
    const result = await new UpdateCompanyUseCase(companies).execute({
      companyId: company.id,
      name: 'Loja Nova',
      taxRegime: 'LUCRO_PRESUMIDO',
    });
    expect(result.name).toBe('Loja Nova');
    expect(result.taxRegime).toBe('LUCRO_PRESUMIDO');
  });
});
