import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { PrismaDashboardQueryRepository } from '../src/modules/dashboard/infrastructure/prisma-dashboard-query.repository';
import { TaxRuleService } from '../src/modules/finance/application/tax-rule.service';
import { PrismaTaxRuleRepository } from '../src/modules/finance/infrastructure/prisma-tax-rule.repository';

/**
 * Integration (Fase 2, Inc.2): regras de imposto com RLS + getTaxes (alíquota
 * efetiva por categoria/regime) contra Postgres real; troca de regime muda o imposto.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = '71111111-1111-1111-1111-111111111111';
const TENANT_B = '82222222-2222-2222-2222-222222222222';
const ACCOUNT_A = '71110000-0000-0000-0000-000000000001';
const PRODUCT_A = '71110001-0001-0001-0001-000000000001';
const CATEGORY = 'MLB-CAT-1';
const range35d = { from: new Date(Date.now() - 35 * 86_400_000), to: new Date(Date.now() + 86_400_000) };

const asTenant = <T>(companyId: string, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId, userId: `${companyId}-u`, role: 'OWNER' }, fn);

describe('Tax rules / getTaxes (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let query: PrismaDashboardQueryRepository;
  let taxes: TaxRuleService;

  const clearRules = () => owner.taxRule.deleteMany({ where: { companyId: { in: [TENANT_A, TENANT_B] } } });

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await clearRules();
    await owner.orderItem.deleteMany({ where: { companyId: TENANT_A } });
    await owner.order.deleteMany({ where: { companyId: TENANT_A } });
    await owner.product.deleteMany({ where: { companyId: TENANT_A } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: TENANT_A } });
    await owner.company.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });

    await owner.company.create({ data: { id: TENANT_A, name: 'Co A', taxRegime: 'SIMPLES_NACIONAL' } });
    await owner.company.create({ data: { id: TENANT_B, name: 'Co B' } });
    await owner.marketplaceAccount.create({ data: { id: ACCOUNT_A, companyId: TENANT_A, marketplaceId: ml.id, externalUserId: 'a', accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) } });
    await owner.product.create({ data: { id: PRODUCT_A, companyId: TENANT_A, marketplaceAccountId: ACCOUNT_A, externalId: 'A-1', sku: 'AAA-1', title: 'Prod', status: 'active', price: 100, categoryId: CATEGORY } });
    const order = await owner.order.create({ data: { companyId: TENANT_A, marketplaceAccountId: ACCOUNT_A, externalId: 'O-1', status: 'PAID', grossAmount: 1000, orderedAt: new Date(Date.now() - 3_600_000) } });
    await owner.orderItem.create({ data: { companyId: TENANT_A, orderId: order.id, productId: PRODUCT_A, externalItemId: 'I-1', sku: 'AAA-1', title: 'Prod', quantity: 10, unitPrice: 100 } }); // receita 1000

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    query = new PrismaDashboardQueryRepository(prisma);
    taxes = new TaxRuleService(new PrismaTaxRuleRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clearRules();
    await owner.orderItem.deleteMany({ where: { companyId: TENANT_A } });
    await owner.order.deleteMany({ where: { companyId: TENANT_A } });
    await owner.product.deleteMany({ where: { companyId: TENANT_A } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: TENANT_A } });
    await owner.company.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await owner.$disconnect();
  });

  it('RLS: regra de imposto de A é invisível a B', async () => {
    await clearRules();
    await asTenant(TENANT_A, () => taxes.upsert({ regime: 'SIMPLES_NACIONAL', rate: 0.08 }));
    expect((await asTenant(TENANT_A, () => taxes.list())).length).toBe(1);
    expect((await asTenant(TENANT_B, () => taxes.list())).length).toBe(0);
  });

  it('sem regra: usa o default do regime (Simples 6%)', async () => {
    await clearRules();
    const r = await asTenant(TENANT_A, () => query.getTaxes(range35d));
    expect(r.tax).toBeCloseTo(60); // 1000 × 0.06
    expect(r.effectiveRatePct).toBeCloseTo(0.06);
  });

  it('regra padrão do regime sobrepõe o default', async () => {
    await clearRules();
    await asTenant(TENANT_A, () => taxes.upsert({ regime: 'SIMPLES_NACIONAL', rate: 0.1 }));
    const r = await asTenant(TENANT_A, () => query.getTaxes(range35d));
    expect(r.tax).toBeCloseTo(100);
  });

  it('override por categoria tem prioridade', async () => {
    await clearRules();
    await asTenant(TENANT_A, () => taxes.upsert({ regime: 'SIMPLES_NACIONAL', rate: 0.1 }));
    await asTenant(TENANT_A, () => taxes.upsert({ regime: 'SIMPLES_NACIONAL', category: CATEGORY, rate: 0.2 }));
    const r = await asTenant(TENANT_A, () => query.getTaxes(range35d));
    expect(r.tax).toBeCloseTo(200); // categoria 20%
  });

  it('trocar o regime muda o imposto', async () => {
    await clearRules();
    await owner.company.update({ where: { id: TENANT_A }, data: { taxRegime: 'LUCRO_PRESUMIDO' } });
    const r = await asTenant(TENANT_A, () => query.getTaxes(range35d));
    expect(r.tax).toBeCloseTo(113.3); // default Lucro Presumido (0.1133 × 1000)
    await owner.company.update({ where: { id: TENANT_A }, data: { taxRegime: 'SIMPLES_NACIONAL' } });
  });
});
