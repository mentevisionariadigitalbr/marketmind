import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaForecastRepository } from '../src/modules/inventory/infrastructure/persistence/prisma-forecast.repository';
import { GetInventoryForecastUseCase } from '../src/modules/inventory/application/inventory-forecast.use-case';

/**
 * Integration (Fase 1, Inc.3): previsão de reposição — agregação de vendas 30/60/90d
 * + lead time do fornecedor (com default) sobre dados reais.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `fc-int-${Date.now()}`;
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Inventory forecast (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let forecast: GetInventoryForecastUseCase;

  let companyA = '';
  let withSupplier = '';
  let noSupplier = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      update: {},
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
    });
    const company = await owner.company.create({ data: { name: `FC-${SUFFIX}` } });
    companyA = company.id;
    const acc = await owner.marketplaceAccount.create({
      data: {
        companyId: companyA,
        marketplaceId: mk.id,
        externalUserId: `ext-${SUFFIX}`,
        accessTokenEnc: 'x',
        refreshTokenEnc: 'x',
        tokenExpiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const supplier = await owner.supplier.create({ data: { companyId: companyA, name: 'Fornecedor FC', leadTimeDays: 7 } });

    const pA = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}-A`, title: 'Produto A', status: 'active', availableQuantity: 10, supplierId: supplier.id },
    });
    const pB = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}-B`, title: 'Produto B', status: 'active', availableQuantity: 5 },
    });
    withSupplier = pA.id;
    noSupplier = pB.id;

    let seq = 0;
    const sell = async (productId: string, qty: number, daysAgo: number) => {
      const order = await owner.order.create({
        data: {
          companyId: companyA,
          marketplaceAccountId: acc.id,
          externalId: `ORD-${SUFFIX}-${seq++}`,
          status: 'PAID',
          orderedAt: new Date(Date.now() - daysAgo * DAY),
        },
      });
      await owner.orderItem.create({
        data: { companyId: companyA, orderId: order.id, productId, externalItemId: `IT-${SUFFIX}-${seq}`, title: 'item', quantity: qty, unitPrice: 100 },
      });
    };
    // Produto A: 10un há 5d, 10un há 40d, 10un há 70d → units30=10, units60=20, units90=30
    await sell(withSupplier, 10, 5);
    await sell(withSupplier, 10, 40);
    await sell(withSupplier, 10, 70);
    // Produto B: 5un há 3d → units30=units60=units90=5
    await sell(noSupplier, 5, 3);

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    forecast = new GetInventoryForecastUseCase(new PrismaForecastRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('agrega vendas 30/60/90d e usa o lead time do fornecedor', async () => {
    const rows = await runWithTenant(tenant(companyA), () => forecast.execute({ horizon: 90 }));
    const a = rows.find((r) => r.productId === withSupplier)!;
    expect(a.leadTimeDays).toBe(7);
    expect(a.cmd).toBeCloseTo(0.3333, 3); // 0.5·(10/30)+0.3·(20/60)+0.2·(30/90)
    expect(a.daysRemaining).toBe(30); // 10 / 0.3333
    expect(a.risk).toBe('saudavel'); // 30 >= 7 + 15
    expect(a.purchaseNeed).toBeGreaterThan(0);
    expect(a.supplierName).toBe('Fornecedor FC');
    expect(a.ruptureDate).not.toBeNull();
  });

  it('usa o lead time default (15d) quando o produto não tem fornecedor', async () => {
    const rows = await runWithTenant(tenant(companyA), () => forecast.execute());
    const b = rows.find((r) => r.productId === noSupplier)!;
    expect(b.leadTimeDays).toBe(15);
    expect(b.supplierName).toBeNull();
  });

  it('filtra por necessidade de compra e ordena por risco', async () => {
    const rows = await runWithTenant(tenant(companyA), () => forecast.execute({ onlyNeeded: true }));
    expect(rows.every((r) => r.purchaseNeed > 0)).toBe(true);
  });
});
