import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaSupplierRepository } from '../src/modules/suppliers/infrastructure/persistence/prisma-supplier.repository';
import {
  CreateSupplierUseCase,
  ListSuppliersUseCase,
  GetSupplierUseCase,
  UpdateSupplierUseCase,
  AssignProductSupplierUseCase,
  ListProductSuppliersUseCase,
} from '../src/modules/suppliers/application/supplier.use-cases';

/**
 * Integration (Fase 1, Inc.2): fornecedores sob RLS. CRUD, vínculo com produto e
 * isolamento por company.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `sup-int-${Date.now()}`;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Suppliers (integration, RLS)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let create: CreateSupplierUseCase;
  let list: ListSuppliersUseCase;
  let get: GetSupplierUseCase;
  let update: UpdateSupplierUseCase;
  let assign: AssignProductSupplierUseCase;
  let listProducts: ListProductSuppliersUseCase;

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
    const seed = async (name: string) => {
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
        data: { companyId: c.id, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}-${name}`, title: `Produto ${name}`, status: 'active' },
      });
      return { companyId: c.id, productId: p.id };
    };
    const a = await seed(`A-${SUFFIX}`);
    const b = await seed(`B-${SUFFIX}`);
    companyA = a.companyId;
    productA = a.productId;
    companyB = b.companyId;

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const repo = new PrismaSupplierRepository(prisma);
    create = new CreateSupplierUseCase(repo);
    list = new ListSuppliersUseCase(repo);
    get = new GetSupplierUseCase(repo);
    update = new UpdateSupplierUseCase(repo);
    assign = new AssignProductSupplierUseCase(repo);
    listProducts = new ListProductSuppliersUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: { in: [companyA, companyB].filter(Boolean) } } });
    await owner.$disconnect();
  });

  it('cria, lê e atualiza um fornecedor', async () => {
    const { id } = await runWithTenant(tenant(companyA), () => create.execute({ name: 'Fornecedor A', leadTimeDays: 10 }));
    const got = await runWithTenant(tenant(companyA), () => get.execute(id));
    expect(got).toMatchObject({ name: 'Fornecedor A', leadTimeDays: 10, active: true });

    await runWithTenant(tenant(companyA), () => update.execute(id, { leadTimeDays: 15, phone: '1199' }));
    const after = await runWithTenant(tenant(companyA), () => get.execute(id));
    expect(after).toMatchObject({ leadTimeDays: 15, phone: '1199' });
  });

  it('vincula um produto ao fornecedor e lista', async () => {
    const { id } = await runWithTenant(tenant(companyA), () => create.execute({ name: 'Fornecedor Vínculo' }));
    await runWithTenant(tenant(companyA), () => assign.execute(productA, id));
    const rows = await runWithTenant(tenant(companyA), () => listProducts.execute());
    const row = rows.find((r) => r.productId === productA);
    expect(row).toMatchObject({ supplierId: id, supplierName: 'Fornecedor Vínculo' });
  });

  it('RLS isola: a empresa B não vê os fornecedores da empresa A', async () => {
    await runWithTenant(tenant(companyA), () => create.execute({ name: 'Só da A' }));
    const fromB = await runWithTenant(tenant(companyB), () => list.execute());
    expect(fromB.some((s) => s.name === 'Só da A')).toBe(false);
  });
});
