import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaAdminCompaniesRepository } from '../src/modules/admin/infrastructure/prisma-admin-companies.repository';

/**
 * Integration (Fase 7, Inc.3): empresas/clientes lidos CROSS-TENANT pelo admin,
 * com assinatura, faturas e filtro de inadimplência (PAST_DUE).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const PLAN_CODE = 'ADMIN_CO_TEST';
const X = 'c9c9c9c9-aaaa-aaaa-aaaa-aaaaaaaaaa01';

describe('Admin companies (integration, cross-tenant)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaAdminCompaniesRepository;

  const clean = async () => {
    await owner.invoice.deleteMany({ where: { companyId: X } });
    await owner.subscription.deleteMany({ where: { companyId: X } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: X } });
    await owner.user.deleteMany({ where: { companyId: X } });
    await owner.company.deleteMany({ where: { id: X } });
    await owner.plan.deleteMany({ where: { code: PLAN_CODE } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    const ml = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
      update: {},
    });
    const plan = await owner.plan.create({ data: { code: PLAN_CODE, name: 'Co Test', priceCents: 9900, interval: 'month' } });
    await owner.company.create({ data: { id: X, name: 'Cliente Inadimplente', taxId: '99999999000199' } });
    await owner.subscription.create({ data: { companyId: X, planId: plan.id, status: 'PAST_DUE', provider: 'stripe' } });
    await owner.user.create({ data: { companyId: X, name: 'Dono', email: 'dono@x.com', passwordHash: 'h', role: 'OWNER' } });
    await owner.user.create({ data: { companyId: X, name: 'Membro', email: 'membro@x.com', passwordHash: 'h', role: 'MEMBER' } });
    await owner.invoice.create({ data: { companyId: X, provider: 'stripe', amountCents: 9900, status: 'FAILED' } });
    await owner.marketplaceAccount.create({
      data: { companyId: X, marketplaceId: ml.id, externalUserId: 'ext', accessTokenEnc: 'SECRET', refreshTokenEnc: 'SECRET', tokenExpiresAt: new Date(Date.now() + 1e9) },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaAdminCompaniesRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('lista por inadimplência (PAST_DUE) traz a empresa com assinatura e contagem de usuários', async () => {
    const page = await repo.listCompanies({ page: 1, pageSize: 100, status: 'PAST_DUE' });
    const item = page.items.find((c) => c.id === X);
    expect(item).toBeDefined();
    expect(item!.subscription?.status).toBe('PAST_DUE');
    expect(item!.subscription?.planCode).toBe(PLAN_CODE);
    expect(item!.usersCount).toBe(2);
  });

  it('detalhe traz assinatura, usuários, faturas e contas — sem expor tokens', async () => {
    const d = await repo.getCompanyDetail(X);
    expect(d).not.toBeNull();
    expect(d!.company.name).toBe('Cliente Inadimplente');
    expect(d!.subscription?.status).toBe('PAST_DUE');
    expect(d!.users).toHaveLength(2);
    expect(d!.invoices).toHaveLength(1);
    expect(d!.invoices[0].status).toBe('FAILED');
    expect(d!.marketplaceAccounts).toHaveLength(1);
    // Garante que tokens NÃO vazam no payload do admin.
    expect(JSON.stringify(d)).not.toContain('SECRET');
  });

  it('detalhe de empresa inexistente é nulo', async () => {
    expect(await repo.getCompanyDetail('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
