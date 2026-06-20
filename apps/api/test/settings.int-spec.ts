import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaCompanyRepository } from '../src/modules/iam/infrastructure/persistence/prisma-company.repository';
import { UpdateCompanyUseCase } from '../src/modules/iam/application/use-cases/update-company.use-case';

/**
 * Integration (Fase 3, Inc.2): atualizar empresa (nome/regime) persiste e é
 * isolado por empresa. Postgres real.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const A = '12121212-1212-1212-1212-121212121212';
const B = '34343434-3434-3434-3434-343434343434';

describe('Settings — UpdateCompany (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let useCase: UpdateCompanyUseCase;

  const clean = () => owner.company.deleteMany({ where: { id: { in: [A, B] } } });

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    await owner.company.create({ data: { id: A, name: 'Loja A', taxRegime: 'SIMPLES_NACIONAL' } });
    await owner.company.create({ data: { id: B, name: 'Loja B', taxRegime: 'SIMPLES_NACIONAL' } });
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    useCase = new UpdateCompanyUseCase(new PrismaCompanyRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('persiste nome e regime; outra empresa não é afetada', async () => {
    const result = await useCase.execute({ companyId: A, name: 'Loja A Nova', taxRegime: 'LUCRO_PRESUMIDO' });
    expect(result.name).toBe('Loja A Nova');
    expect(result.taxRegime).toBe('LUCRO_PRESUMIDO');

    const a = await owner.company.findUnique({ where: { id: A } });
    const b = await owner.company.findUnique({ where: { id: B } });
    expect(a?.taxRegime).toBe('LUCRO_PRESUMIDO');
    expect(b?.taxRegime).toBe('SIMPLES_NACIONAL'); // intacta
    expect(b?.name).toBe('Loja B');
  });
});
