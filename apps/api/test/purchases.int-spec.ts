import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaPurchaseOrderRepository } from '../src/modules/purchases/infrastructure/persistence/prisma-purchase-order.repository';
import {
  CreatePurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
} from '../src/modules/purchases/application/purchase-order.use-cases';

/**
 * Integration (Fase 1, Inc.4): recebimento de compra fecha o ciclo — gera ENTRADA
 * no razão de estoque e atualiza o custo do produto por média ponderada. RLS por company.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `po-int-${Date.now()}`;
const USER_ID = '00000000-0000-0000-0000-0000000000b2';

function tenant(companyId: string): TenantContext {
  return { companyId, userId: USER_ID, role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Purchases — receiving (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let create: CreatePurchaseOrderUseCase;
  let receive: ReceivePurchaseOrderUseCase;

  let companyA = '';
  let supplierId = '';
  let productId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      update: {},
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
    });
    const company = await owner.company.create({ data: { name: `PO-${SUFFIX}` } });
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
    const supplier = await owner.supplier.create({ data: { companyId: companyA, name: 'Fornecedor PO', leadTimeDays: 7 } });
    supplierId = supplier.id;
    const product = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}`, title: 'Produto PO', status: 'active', availableQuantity: 10 },
    });
    productId = product.id;
    // Custo inicial: R$10 de aquisição (10 unidades em estoque).
    await owner.productCost.create({
      data: { companyId: companyA, productId, acquisitionCost: 10, validFrom: new Date(Date.now() - 86_400_000) },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const repo = new PrismaPurchaseOrderRepository(prisma);
    create = new CreatePurchaseOrderUseCase(repo);
    receive = new ReceivePurchaseOrderUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: companyA } });
    await owner.$disconnect();
  });

  it('recebe o pedido: ENTRADA no razão + custo médio ponderado', async () => {
    const { id } = await runWithTenant(tenant(companyA), () =>
      create.execute({ supplierId, items: [{ productId, quantity: 10, unitCost: 20 }], createdBy: USER_ID }),
    );

    await runWithTenant(tenant(companyA), () => receive.execute(id, USER_ID));

    // ENTRADA registrada: 10 un, saldo 20 (10 abertura + 10), custo unitário 20.
    const movements = await owner.stockMovement.findMany({ where: { productId, type: 'ENTRADA' } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ quantity: 10, balanceAfter: 20, referenceType: 'purchase_order', referenceId: id });
    expect(Number(movements[0].unitCost)).toBe(20);

    // Custo médio: (10×10 + 10×20) / 20 = 15.
    const costs = await owner.productCost.findMany({ where: { productId }, orderBy: { validFrom: 'desc' } });
    expect(Number(costs[0].acquisitionCost)).toBe(15);

    // Pedido marcado RECEIVED + item recebido.
    const po = await owner.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    expect(po?.status).toBe('RECEIVED');
    expect(po?.receivedAt).not.toBeNull();
    expect(po?.items[0].receivedQuantity).toBe(10);
  });

  it('não recebe duas vezes', async () => {
    const { id } = await runWithTenant(tenant(companyA), () =>
      create.execute({ supplierId, items: [{ productId, quantity: 1, unitCost: 30 }], createdBy: USER_ID }),
    );
    await runWithTenant(tenant(companyA), () => receive.execute(id, USER_ID));
    await expect(runWithTenant(tenant(companyA), () => receive.execute(id, USER_ID))).rejects.toThrow();
  });
});
