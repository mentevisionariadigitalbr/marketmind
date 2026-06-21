import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant } from '@marketmind/kernel';
import { PrismaPrivacyRepository } from '../src/modules/privacy/infrastructure/persistence/prisma-privacy.repository';
import { DeleteMyAccountUseCase } from '../src/modules/privacy/application/delete-my-account.use-case';

/**
 * Integration (Fase 6, Inc.3): exclusão de conta contra Postgres. Critérios:
 * anonimiza o(s) usuário(s), purga dados de negócio, RETÉM faturas (fiscal),
 * respeita o isolamento multi-tenant e registra o pedido.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const A = 'b7b7b7b7-8888-8888-8888-888888888801'; // OWNER deletion (escopo COMPANY)
const USER_A = 'b7b7b7b7-8888-8888-8888-8888888888a1';
const M = 'b7b7b7b7-8888-8888-8888-888888888802'; // MEMBER deletion (escopo USER)
const OWNER_M = 'b7b7b7b7-8888-8888-8888-8888888888b1';
const MEMBER_M = 'b7b7b7b7-8888-8888-8888-8888888888b2';
const B = 'b7b7b7b7-8888-8888-8888-888888888803'; // controle (não deve ser tocado)
const USER_B = 'b7b7b7b7-8888-8888-8888-8888888888c1';

function tenant(companyId: string, userId: string) {
  return { companyId, userId, role: 'OWNER' };
}

describe('Privacy — exclusão de conta (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let useCase: DeleteMyAccountUseCase;

  const companies = [A, M, B];

  const clean = async () => {
    await owner.$executeRawUnsafe(`DELETE FROM data_subject_requests WHERE company_id = ANY($1::uuid[])`, companies);
    await owner.legalAcceptance.deleteMany({ where: { companyId: { in: companies } } });
    await owner.invoice.deleteMany({ where: { companyId: { in: companies } } });
    await owner.expense.deleteMany({ where: { companyId: { in: companies } } });
    await owner.customer.deleteMany({ where: { companyId: { in: companies } } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: { in: companies } } });
    await owner.user.deleteMany({ where: { companyId: { in: companies } } });
    await owner.company.deleteMany({ where: { id: { in: companies } } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    const ml = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
      update: {},
    });

    // Empresa A (OWNER) com dados de negócio + fatura + aceite.
    await owner.company.create({ data: { id: A, name: 'Empresa A', taxId: '11111111000111' } });
    await owner.user.create({ data: { id: USER_A, companyId: A, name: 'Ana', email: 'ana@del.com', passwordHash: 'h', googleId: 'g-a', status: 'ACTIVE' } });
    await owner.marketplaceAccount.create({ data: { companyId: A, marketplaceId: ml.id, externalUserId: 'ext-a', accessTokenEnc: 'x', refreshTokenEnc: 'y', tokenExpiresAt: new Date(Date.now() + 1e9) } });
    await owner.customer.create({ data: { companyId: A, externalId: 'cust-a', nickname: 'Cliente A' } });
    await owner.expense.create({ data: { companyId: A, category: 'Aluguel', amount: '100.00', startsOn: new Date() } });
    await owner.invoice.create({ data: { companyId: A, provider: 'stripe', amountCents: 9900, status: 'PAID' } });
    await owner.legalAcceptance.create({ data: { companyId: A, userId: USER_A, documentType: 'TERMS', version: '2026-06-22' } });

    // Empresa M (OWNER + MEMBER) para exclusão de escopo USER.
    await owner.company.create({ data: { id: M, name: 'Empresa M' } });
    await owner.user.create({ data: { id: OWNER_M, companyId: M, name: 'Dono M', email: 'dono@m.com', passwordHash: 'h', status: 'ACTIVE' } });
    await owner.user.create({ data: { id: MEMBER_M, companyId: M, name: 'Membro M', email: 'membro@m.com', passwordHash: 'h', role: 'MEMBER', status: 'ACTIVE' } });

    // Empresa B (controle).
    await owner.company.create({ data: { id: B, name: 'Empresa B' } });
    await owner.user.create({ data: { id: USER_B, companyId: B, name: 'Bruno', email: 'bruno@b.com', passwordHash: 'h', status: 'ACTIVE' } });
    await owner.invoice.create({ data: { companyId: B, provider: 'stripe', amountCents: 5000, status: 'PAID' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    useCase = new DeleteMyAccountUseCase(new PrismaPrivacyRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('OWNER: anonimiza, purga negócio, RETÉM fatura, anonimiza a empresa e registra o pedido', async () => {
    const res = await runWithTenant(tenant(A, USER_A), () =>
      useCase.execute({ userId: USER_A, companyId: A, role: 'OWNER' }),
    );
    expect(res.scope).toBe('COMPANY');

    const user = await owner.user.findUnique({ where: { id: USER_A } });
    expect(user?.name).toBe('Conta excluída');
    expect(user?.email).toBe(`deleted+${USER_A}@removed.invalid`);
    expect(user?.passwordHash).toBeNull();
    expect(user?.googleId).toBeNull();
    expect(user?.status).toBe('DISABLED');

    // Dados de negócio purgados.
    expect(await owner.marketplaceAccount.count({ where: { companyId: A } })).toBe(0);
    expect(await owner.customer.count({ where: { companyId: A } })).toBe(0);
    expect(await owner.expense.count({ where: { companyId: A } })).toBe(0);

    // Fiscal e consentimento RETIDOS.
    expect(await owner.invoice.count({ where: { companyId: A } })).toBe(1);
    expect(await owner.legalAcceptance.count({ where: { companyId: A } })).toBe(1);

    // Empresa anonimizada.
    const company = await owner.company.findUnique({ where: { id: A } });
    expect(company?.name).toBe('Conta excluída');
    expect(company?.taxId).toBeNull();

    // Pedido registrado.
    const reqs = await owner.dataSubjectRequest.findMany({ where: { companyId: A } });
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({ type: 'DELETION', scope: 'COMPANY', userId: USER_A });
  });

  it('MEMBER: anonimiza apenas a si; dono e empresa permanecem', async () => {
    await runWithTenant(tenant(M, MEMBER_M), () =>
      new DeleteMyAccountUseCase(new PrismaPrivacyRepository(prisma)).execute({ userId: MEMBER_M, companyId: M, role: 'MEMBER' }),
    );

    const member = await owner.user.findUnique({ where: { id: MEMBER_M } });
    expect(member?.status).toBe('DISABLED');
    expect(member?.name).toBe('Conta excluída');

    const ownerUser = await owner.user.findUnique({ where: { id: OWNER_M } });
    expect(ownerUser?.name).toBe('Dono M'); // intacto
    const company = await owner.company.findUnique({ where: { id: M } });
    expect(company?.name).toBe('Empresa M'); // intacta
  });

  it('isolamento: a empresa B (controle) permanece intacta', async () => {
    const userB = await owner.user.findUnique({ where: { id: USER_B } });
    expect(userB?.name).toBe('Bruno');
    expect(userB?.status).toBe('ACTIVE');
    expect(await owner.invoice.count({ where: { companyId: B } })).toBe(1);
    const companyB = await owner.company.findUnique({ where: { id: B } });
    expect(companyB?.name).toBe('Empresa B');
  });
});
