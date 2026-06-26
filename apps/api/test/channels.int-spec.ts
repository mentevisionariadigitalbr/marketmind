import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaChannelsRepository } from '../src/modules/channels/infrastructure/persistence/prisma-channels.repository';
import { ImportManualSalesUseCase, GetChannelSummaryUseCase } from '../src/modules/channels/application/channels.use-cases';

/**
 * Integration (Fase 3, Inc.4): canal manual — import idempotente de vendas via CSV,
 * vínculo por SKU e resumo por canal. RLS por company.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `ch-int-${Date.now()}`;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Channels — manual sales (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let importManual: ImportManualSalesUseCase;
  let summary: GetChannelSummaryUseCase;

  let companyA = '';
  let productAbc = '';

  const csv = ['data,sku,qtd,preco,comissao,frete', '2026-06-25,ABC,2,100', '2026-06-26,XYZ,1,50,5,3'].join('\n');

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    await owner.marketplace.upsert({ where: { code: 'MANUAL' }, update: {}, create: { code: 'MANUAL', name: 'Manual / Outros' } });
    const company = await owner.company.create({ data: { name: `CH-${SUFFIX}` } });
    companyA = company.id;
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: companyA, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    productAbc = (await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}`, title: 'Produto ABC', status: 'active', sku: 'ABC' },
    })).id;

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const repo = new PrismaChannelsRepository(prisma);
    importManual = new ImportManualSalesUseCase(repo);
    summary = new GetChannelSummaryUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('importa vendas manuais e vincula por SKU', async () => {
    const res = await runWithTenant(tenant(companyA), () => importManual.execute(csv));
    expect(res.imported).toBe(2);
    expect(res.errors).toHaveLength(0);

    const manual = await owner.marketplaceAccount.findFirst({ where: { companyId: companyA, externalUserId: 'manual' } });
    const orders = await owner.order.findMany({ where: { marketplaceAccountId: manual!.id }, include: { items: true } });
    expect(orders).toHaveLength(2);
    const abcOrder = orders.find((o) => o.items[0]?.sku === 'ABC')!;
    expect(abcOrder.items[0].productId).toBe(productAbc); // vinculado por SKU
    expect(Number(abcOrder.grossAmount)).toBe(200);
  });

  it('re-importar é idempotente (não duplica)', async () => {
    await runWithTenant(tenant(companyA), () => importManual.execute(csv));
    const manual = await owner.marketplaceAccount.findFirst({ where: { companyId: companyA, externalUserId: 'manual' } });
    const count = await owner.order.count({ where: { marketplaceAccountId: manual!.id } });
    expect(count).toBe(2);
  });

  it('resumo por canal soma receita/pedidos/unidades do manual', async () => {
    const rows = await runWithTenant(tenant(companyA), () => summary.execute(365));
    const manual = rows.find((r) => r.marketplaceCode === 'MANUAL')!;
    expect(manual.revenue).toBe(250); // 200 + 50
    expect(manual.orders).toBe(2);
    expect(manual.units).toBe(3); // 2 + 1
  });
});
