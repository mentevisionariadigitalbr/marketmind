import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaProductEditRepository } from '../src/modules/products/infrastructure/persistence/prisma-product-edit.repository';
import { GetProductUseCase, UpdateProductUseCase } from '../src/modules/products/application/product.use-cases';

/**
 * Integration (Fase 2, Inc.1): edição manual de produto. Override interno, preço
 * efetivo, sync-safety (campos manuais não são apagados) e isolamento RLS.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `pe-int-${Date.now()}`;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

describe('Product manual edit (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let get: GetProductUseCase;
  let update: UpdateProductUseCase;

  let companyA = '';
  let companyB = '';
  let productA = '';
  let accAId = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const seed = async (name: string, price: number) => {
      const c = await owner.company.create({ data: { name } });
      const acc = await owner.marketplaceAccount.create({
        data: { companyId: c.id, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}-${name}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
      });
      const p = await owner.product.create({
        data: { companyId: c.id, marketplaceAccountId: acc.id, externalId: `MLB-${SUFFIX}-${name}`, title: `Título ML ${name}`, status: 'active', price },
      });
      return { companyId: c.id, productId: p.id, accId: acc.id };
    };
    const a = await seed(`A-${SUFFIX}`, 100);
    const b = await seed(`B-${SUFFIX}`, 50);
    companyA = a.companyId;
    productA = a.productId;
    accAId = a.accId;
    companyB = b.companyId;

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const repo = new PrismaProductEditRepository(prisma);
    get = new GetProductUseCase(repo);
    update = new UpdateProductUseCase(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: { in: [companyA, companyB].filter(Boolean) } } });
    await owner.$disconnect();
  });

  it('edita campos manuais e calcula título/preço efetivos', async () => {
    await runWithTenant(tenant(companyA), () =>
      update.execute(productA, { internalTitle: 'Meu nome', brand: 'Acme', internalSku: 'SKU-1', promoPrice: 80 }),
    );
    const p = await runWithTenant(tenant(companyA), () => get.execute(productA));
    expect(p).toMatchObject({ internalTitle: 'Meu nome', brand: 'Acme', internalSku: 'SKU-1', promoPrice: 80 });
    expect(p.effectiveTitle).toBe('Meu nome'); // override interno
    expect(p.effectivePrice).toBe(80); // promo vence o preço cheio (100)
  });

  it('o sync do ML NÃO apaga os campos manuais', async () => {
    // Simula um sync: atualiza só os campos do ML (como o repositório de catálogo faz).
    await owner.product.update({ where: { id: productA }, data: { title: 'Título ML novo', price: 120, availableQuantity: 9 } });
    const p = await runWithTenant(tenant(companyA), () => get.execute(productA));
    expect(p.mlTitle).toBe('Título ML novo');
    expect(p.brand).toBe('Acme'); // manual preservado
    expect(p.effectiveTitle).toBe('Meu nome'); // ainda usa o override
    expect(p.effectivePrice).toBe(80); // promo preservado
  });

  it('RLS isola: a empresa B não acessa o produto da empresa A', async () => {
    const fromB = await runWithTenant(tenant(companyB), () => get.execute(productA).catch(() => null));
    expect(fromB).toBeNull();
    await expect(
      runWithTenant(tenant(companyB), () => update.execute(productA, { brand: 'Hack' })),
    ).rejects.toThrow();
    // garante que nada mudou
    const p = await runWithTenant(tenant(companyA), () => get.execute(productA));
    expect(p.brand).toBe('Acme');
    void accAId;
  });
});
