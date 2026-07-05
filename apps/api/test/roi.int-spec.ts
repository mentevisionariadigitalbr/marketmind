import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaRoiRepository } from '../src/modules/analytics/infrastructure/persistence/prisma-roi.repository';
import { GetProductRoiUseCase, GetSupplierRoiUseCase } from '../src/modules/analytics/application/roi.use-cases';

/**
 * Integration (Fase 2, Inc.2): ROI por produto (sobre COGS) e por fornecedor
 * (sobre o valor comprado) a partir de vendas + custos + compras reais.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `roi-int-${Date.now()}`;
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('ROI (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let productRoi: GetProductRoiUseCase;
  let supplierRoi: GetSupplierRoiUseCase;

  let companyA = '';
  let supplierId = '';
  let productId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const company = await owner.company.create({ data: { name: `ROI-${SUFFIX}` } });
    companyA = company.id;
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: companyA, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    const supplier = await owner.supplier.create({ data: { companyId: companyA, name: 'Fornecedor ROI' } });
    supplierId = supplier.id;
    const product = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}`, title: 'Produto ROI', status: 'active', price: 100, promoPrice: 80, supplierId },
    });
    productId = product.id;
    // Custo de aquisição R$60.
    await owner.productCost.create({ data: { companyId: companyA, productId, acquisitionCost: 60, validFrom: new Date(Date.now() - 2 * DAY) } });
    // Venda: 10 un a R$100 → receita R$1000.
    const order = await owner.order.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `ORD-${SUFFIX}`, status: 'PAID', orderedAt: new Date(Date.now() - 3 * DAY) },
    });
    await owner.orderItem.create({
      data: { companyId: companyA, orderId: order.id, productId, externalItemId: `IT-${SUFFIX}`, title: 'item', quantity: 10, unitPrice: 100 },
    });
    // Compra recebida: 10 un a R$50 → valor comprado R$500 (inserida direto, sem alterar custo).
    const po = await owner.purchaseOrder.create({
      data: { companyId: companyA, supplierId, status: 'RECEIVED', receivedAt: new Date(Date.now() - DAY) },
    });
    await owner.purchaseOrderItem.create({
      data: { companyId: companyA, purchaseOrderId: po.id, productId, quantity: 10, unitCost: 50, receivedQuantity: 10 },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const repo = new PrismaRoiRepository(prisma);
    productRoi = new GetProductRoiUseCase(repo);
    supplierRoi = new GetSupplierRoiUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('ROI por produto: receita, COGS, lucro e margem prospectiva', async () => {
    const rows = await runWithTenant(tenant(companyA), () => productRoi.execute('30d'));
    const r = rows.find((x) => x.productId === productId)!;
    expect(r.revenue).toBe(1000);
    expect(r.units).toBe(10);
    expect(r.unitCost).toBe(60);
    expect(r.cogs).toBe(600);
    expect(r.profit).toBe(400);
    expect(r.roi).toBeCloseTo(0.6667, 3);
    expect(r.effectivePrice).toBe(80); // promo
    expect(r.prospectiveMargin).toBeCloseTo(0.25, 5);
  });

  it('ROI por fornecedor: lucro gerado sobre o valor comprado', async () => {
    const rows = await runWithTenant(tenant(companyA), () => supplierRoi.execute('30d'));
    const s = rows.find((x) => x.supplierId === supplierId)!;
    expect(s.revenue).toBe(1000);
    expect(s.cogs).toBe(600);
    expect(s.profit).toBe(400);
    expect(s.purchased).toBe(500);
    expect(s.roi).toBeCloseTo(0.8, 5); // 400 / 500
    expect(s.productsSold).toBe(1);
  });
});
