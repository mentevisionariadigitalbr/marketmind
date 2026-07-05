import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaPurchaseOrderRepository } from '../src/modules/purchases/infrastructure/persistence/prisma-purchase-order.repository';
import { CreatePurchaseOrderUseCase, ReceivePurchaseOrderUseCase } from '../src/modules/purchases/application/purchase-order.use-cases';
import { PrismaCashflowRepository } from '../src/modules/cashflow/infrastructure/persistence/prisma-cashflow.repository';
import {
  ListPayablesUseCase,
  PayPayableUseCase,
  GetCashflowProjectionUseCase,
} from '../src/modules/cashflow/application/cashflow.use-cases';

/**
 * Integration (Fase 3, Inc.1): fluxo de caixa — recebimento gera conta a pagar,
 * projeção reflete entradas (vendas) e saídas (a pagar), e RLS isola por company.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `cf-int-${Date.now()}`;
const USER_ID = '00000000-0000-0000-0000-0000000000c3';
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: USER_ID, role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Cashflow (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let createPo: CreatePurchaseOrderUseCase;
  let receivePo: ReceivePurchaseOrderUseCase;
  let listPayables: ListPayablesUseCase;
  let payPayable: PayPayableUseCase;
  let projection: GetCashflowProjectionUseCase;

  let companyA = '';
  let companyB = '';
  let supplierId = '';
  let productId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const seed = async (name: string) => {
      const c = await owner.company.create({ data: { name } });
      const acc = await owner.marketplaceAccount.create({
        data: { companyId: c.id, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}-${name}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
      });
      return { companyId: c.id, accId: acc.id };
    };
    const a = await seed(`A-${SUFFIX}`);
    const b = await seed(`B-${SUFFIX}`);
    companyA = a.companyId;
    companyB = b.companyId;
    const supplier = await owner.supplier.create({ data: { companyId: companyA, name: 'Fornecedor CF', paymentTermDays: 30 } });
    supplierId = supplier.id;
    const product = await owner.product.create({
      data: { companyId: companyA, marketplaceAccountId: a.accId, externalId: `MLB-${SUFFIX}`, title: 'Produto CF', status: 'active', availableQuantity: 5, supplierId },
    });
    productId = product.id;
    // Venda paga (a receber): líquido = 1000 − 100 − 50 = 850, há 3 dias.
    await owner.order.create({
      data: { companyId: companyA, marketplaceAccountId: a.accId, externalId: `ORD-${SUFFIX}`, status: 'PAID', orderedAt: new Date(Date.now() - 3 * DAY), grossAmount: 1000, commissionAmount: 100, freightAmount: 50 },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const poRepo = new PrismaPurchaseOrderRepository(prisma);
    createPo = new CreatePurchaseOrderUseCase(poRepo);
    receivePo = new ReceivePurchaseOrderUseCase(poRepo);
    const cfRepo = new PrismaCashflowRepository(prisma);
    listPayables = new ListPayablesUseCase(cfRepo);
    payPayable = new PayPayableUseCase(cfRepo);
    projection = new GetCashflowProjectionUseCase(cfRepo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: { in: [companyA, companyB].filter(Boolean) } } });
    await owner.$disconnect();
  });

  it('o recebimento de uma compra gera a conta a pagar (vencimento = +prazo do fornecedor)', async () => {
    const { id } = await runWithTenant(tenant(companyA), () =>
      createPo.execute({ supplierId, items: [{ productId, quantity: 10, unitCost: 50 }], createdBy: USER_ID }),
    );
    await runWithTenant(tenant(companyA), () => receivePo.execute(id, USER_ID));

    const payables = await runWithTenant(tenant(companyA), () => listPayables.execute());
    const fromPo = payables.find((p) => p.sourceType === 'purchase_order');
    expect(fromPo).toBeDefined();
    expect(fromPo!.amount).toBe(500); // 10 × 50
    const days = (new Date(fromPo!.dueDate).getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(28); // ~30 dias
  });

  it('a projeção reflete entrada (venda líquida) e saída (a pagar)', async () => {
    const proj = await runWithTenant(tenant(companyA), () => projection.execute());
    expect(proj.totals.inflow).toBeGreaterThanOrEqual(850);
    expect(proj.totals.outflow).toBeGreaterThanOrEqual(500);
  });

  it('marca a conta como paga', async () => {
    const payables = await runWithTenant(tenant(companyA), () => listPayables.execute());
    const pending = payables.find((p) => p.status === 'PENDING')!;
    await runWithTenant(tenant(companyA), () => payPayable.execute(pending.id));
    const after = await runWithTenant(tenant(companyA), () => listPayables.execute());
    expect(after.find((p) => p.id === pending.id)?.status).toBe('PAID');
  });

  it('RLS isola: a empresa B não vê as contas da empresa A', async () => {
    const fromB = await runWithTenant(tenant(companyB), () => listPayables.execute());
    expect(fromB.length).toBe(0);
  });
});
