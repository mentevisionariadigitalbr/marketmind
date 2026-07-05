import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaStockMovementRepository } from '../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import {
  RegisterAdjustmentUseCase,
  RegisterInventoryCountUseCase,
  GetReconciliationUseCase,
  ListMovementsUseCase,
} from '../src/modules/inventory/application/stock-movement.use-cases';

/**
 * Integration (Fase 1, Inc.1): razão de estoque sob RLS. Verifica abertura pelo
 * disponível do ML, ajuste/inventário, conciliação (divergência) e isolamento por company.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `inv-int-${Date.now()}`;
const USER_ID = '00000000-0000-0000-0000-0000000000a1';

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Inventory movements (integration, RLS)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaStockMovementRepository;
  let adjust: RegisterAdjustmentUseCase;
  let count: RegisterInventoryCountUseCase;
  let reconc: GetReconciliationUseCase;
  let movements: ListMovementsUseCase;

  let companyA = '';
  let companyB = '';
  let productA = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });

    const mk = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      update: {},
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
    });

    const seedCompany = async (name: string, mlAvailable: number) => {
      const c = await owner.company.create({ data: { name } });
      const acc = await owner.marketplaceAccount.create({
        data: {
          companyId: c.id,
          marketplaceId: mk.id,
          externalUserId: `ext-${SUFFIX}-${name}`,
          accessTokenEnc: 'x',
          refreshTokenEnc: 'x',
          tokenExpiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      const p = await owner.product.create({
        data: {
          companyId: c.id,
          marketplaceAccountId: acc.id,
          externalId: `MLB-${SUFFIX}-${name}`,
          title: `Produto ${name}`,
          status: 'active',
          availableQuantity: mlAvailable,
        },
      });
      return { companyId: c.id, productId: p.id };
    };

    const a = await seedCompany(`A-${SUFFIX}`, 10);
    const b = await seedCompany(`B-${SUFFIX}`, 5);
    companyA = a.companyId;
    productA = a.productId;
    companyB = b.companyId;

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaStockMovementRepository(prisma);
    adjust = new RegisterAdjustmentUseCase(repo);
    count = new RegisterInventoryCountUseCase(repo);
    reconc = new GetReconciliationUseCase(repo);
    movements = new ListMovementsUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: { in: [companyA, companyB].filter(Boolean) } } });
    await owner.$disconnect();
  });

  it('abre o razão pelo disponível do ML e registra o ajuste', async () => {
    await runWithTenant(tenant(companyA), () => adjust.execute({ productId: productA, quantity: -3, reason: 'quebra', userId: USER_ID }));
    const balance = await runWithTenant(tenant(companyA), () => repo.currentLedgerBalance(productA));
    expect(balance).toBe(7); // 10 (ML) − 3
    const rows = await runWithTenant(tenant(companyA), () => movements.execute(productA));
    expect(rows[0]).toMatchObject({ type: 'AJUSTE', quantity: -3, balanceAfter: 7 });
  });

  it('inventário gera a diferença sobre o saldo do razão', async () => {
    await runWithTenant(tenant(companyA), () => count.execute({ productId: productA, countedQuantity: 20, userId: USER_ID }));
    const balance = await runWithTenant(tenant(companyA), () => repo.currentLedgerBalance(productA));
    expect(balance).toBe(20);
    const rows = await runWithTenant(tenant(companyA), () => movements.execute(productA));
    expect(rows[0]).toMatchObject({ type: 'INVENTARIO', quantity: 13, balanceAfter: 20 }); // 20 − 7
  });

  it('conciliação mostra a divergência razão × ML', async () => {
    const rec = await runWithTenant(tenant(companyA), () => reconc.execute());
    const item = rec.find((r) => r.productId === productA);
    expect(item).toMatchObject({ mlAvailable: 10, ledgerBalance: 20, divergence: 10 });
  });

  it('RLS isola: a empresa B não vê o razão da empresa A', async () => {
    const balanceFromB = await runWithTenant(tenant(companyB), () => repo.currentLedgerBalance(productA));
    expect(balanceFromB).toBeNull();
    const productFromB = await runWithTenant(tenant(companyB), () => repo.findProduct(productA));
    expect(productFromB).toBeNull();
    const recB = await runWithTenant(tenant(companyB), () => reconc.execute());
    expect(recB.some((r) => r.productId === productA)).toBe(false);
  });
});
