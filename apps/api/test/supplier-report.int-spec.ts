import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaSupplierRepository } from '../src/modules/suppliers/infrastructure/persistence/prisma-supplier.repository';
import { PrismaSupplierReportRepository } from '../src/modules/suppliers/infrastructure/persistence/prisma-supplier-report.repository';
import { GetSupplierReportUseCase } from '../src/modules/suppliers/application/supplier-report.use-case';

/**
 * Integration (Fase 2, Inc.3): relatório por fornecedor — produtos vendidos,
 * COGS/lucro/margem, estoque a custo e ROI sobre o valor comprado.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `srep-int-${Date.now()}`;
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Supplier report (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let report: GetSupplierReportUseCase;

  let companyA = '';
  let supplierId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const company = await owner.company.create({ data: { name: `SREP-${SUFFIX}` } });
    companyA = company.id;
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: companyA, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    const supplier = await owner.supplier.create({ data: { companyId: companyA, name: 'Fornecedor Rep', leadTimeDays: 12 } });
    supplierId = supplier.id;
    const product = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}`, title: 'Produto Rep', status: 'active', price: 100, availableQuantity: 8, supplierId },
    });
    await owner.productCost.create({ data: { companyId: companyA, productId: product.id, acquisitionCost: 60, validFrom: new Date(Date.now() - 2 * DAY) } });
    const order = await owner.order.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `ORD-${SUFFIX}`, status: 'PAID', orderedAt: new Date(Date.now() - 3 * DAY) },
    });
    await owner.orderItem.create({
      data: { companyId: companyA, orderId: order.id, productId: product.id, externalItemId: `IT-${SUFFIX}`, title: 'item', quantity: 10, unitPrice: 100 },
    });
    const po = await owner.purchaseOrder.create({ data: { companyId: companyA, supplierId, status: 'RECEIVED', receivedAt: new Date(Date.now() - DAY) } });
    await owner.purchaseOrderItem.create({ data: { companyId: companyA, purchaseOrderId: po.id, productId: product.id, quantity: 10, unitCost: 50, receivedQuantity: 10 } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    report = new GetSupplierReportUseCase(new PrismaSupplierRepository(prisma), new PrismaSupplierReportRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('consolida vendas, custo, estoque e ROI do fornecedor', async () => {
    const r = await runWithTenant(tenant(companyA), () => report.execute(supplierId, '30d'));
    expect(r.supplier).toMatchObject({ name: 'Fornecedor Rep', leadTimeDays: 12 });

    expect(r.products).toHaveLength(1);
    expect(r.products[0]).toMatchObject({
      available: 8,
      unitsSold: 10,
      revenue: 1000,
      unitCost: 60,
      cogs: 600,
      profit: 400,
      stockValueAtCost: 480, // 8 × 60
    });
    expect(r.products[0].marginPct).toBeCloseTo(0.4, 5);

    expect(r.totals).toMatchObject({
      revenue: 1000,
      cogs: 600,
      profit: 400,
      purchased: 500,
      unitsSold: 10,
      productsCount: 1,
      stockUnits: 8,
      stockValueAtCost: 480,
    });
    expect(r.totals.roi).toBeCloseTo(0.8, 5); // 400 / 500
  });
});
