import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaPricingRepository } from '../src/modules/pricing/infrastructure/persistence/prisma-pricing.repository';
import { GetPricingUseCase } from '../src/modules/pricing/application/pricing.use-cases';

/**
 * Integration (Fase 3, Inc.2): precificação — infere comissão/frete dos pedidos
 * reais e calcula break-even/sugerido por produto.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `pr-int-${Date.now()}`;
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Pricing (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let pricing: GetPricingUseCase;

  let companyA = '';
  let productId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const company = await owner.company.create({ data: { name: `PR-${SUFFIX}` } });
    companyA = company.id;
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: companyA, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    const product = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}`, title: 'Produto PR', status: 'active', price: 100 },
    });
    productId = product.id;
    await owner.productCost.create({ data: { companyId: companyA, productId, acquisitionCost: 60, validFrom: new Date(Date.now() - 2 * DAY) } });
    // Pedido: bruto 1000, comissão 120 (12%), frete 100; 10 unidades → frete/un = 10.
    const order = await owner.order.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `ORD-${SUFFIX}`, status: 'PAID', orderedAt: new Date(Date.now() - 3 * DAY), grossAmount: 1000, commissionAmount: 120, freightAmount: 100 },
    });
    await owner.orderItem.create({
      data: { companyId: companyA, orderId: order.id, productId, externalItemId: `IT-${SUFFIX}`, title: 'item', quantity: 10, unitPrice: 100 },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    pricing = new GetPricingUseCase(new PrismaPricingRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('infere comissão 12% e frete R$10/un e calcula os preços', async () => {
    const res = await runWithTenant(tenant(companyA), () => pricing.execute({ targetMargin: 0.3 }));
    expect(res.params.commissionRate).toBeCloseTo(0.12, 4);
    expect(res.params.freight).toBeCloseTo(10, 4);

    const r = res.products.find((x) => x.productId === productId)!;
    expect(r.unitCost).toBe(60);
    expect(r.breakEven).toBeCloseTo(79.55, 1); // 70 / 0,88
    expect(r.suggested).toBeCloseTo(120.69, 1); // 70 / 0,58
    expect(r.realizedMargin).toBeCloseTo(0.18, 3);
  });
});
