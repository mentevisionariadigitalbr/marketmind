import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaCatalogSyncRepository } from '@marketmind/integration-core';
import { NormalizedProduct } from '@marketmind/integration-core';
import { runWithTenant } from '@marketmind/kernel';

const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'cccc0000-0000-0000-0000-000000000001';
const ACCOUNT = 'cccc0000-0000-0000-0000-0000000000a1';

function makeProduct(price: number): NormalizedProduct {
  return {
    companyId: COMPANY,
    marketplaceAccountId: ACCOUNT,
    externalId: 'MLB-CAT-1',
    sku: 'SKU-1',
    title: 'Camiseta',
    status: 'active',
    price,
    currency: 'BRL',
    availableQuantity: 10,
    categoryId: 'MLB1',
    permalink: null,
    thumbnail: null,
    listingType: 'gold_special',
    variants: [
      { externalId: '1', sku: 'SKU-1-P', gtin: null, color: 'Azul', size: 'P', price, availableQuantity: 6, attributes: { COLOR: 'Azul' } },
      { externalId: '2', sku: 'SKU-1-M', gtin: null, color: 'Azul', size: 'M', price, availableQuantity: 4, attributes: { COLOR: 'Azul' } },
    ],
    images: [{ externalId: 'pic1', url: 'https://img/1.jpg', position: 0 }],
  };
}

const tenant = <T>(fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId: COMPANY, userId: 'u', role: 'OWNER' }, fn);

describe('Catalog sync (integration): idempotência + concorrência', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaCatalogSyncRepository;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
      update: {},
    });
    await owner.company.upsert({ where: { id: COMPANY }, create: { id: COMPANY, name: 'Catalog Co' }, update: {} });
    await owner.marketplaceAccount.upsert({
      where: { id: ACCOUNT },
      create: {
        id: ACCOUNT,
        companyId: COMPANY,
        marketplaceId: ml.id,
        externalUserId: '555',
        accessTokenEnc: 'enc',
        refreshTokenEnc: 'enc',
        tokenExpiresAt: new Date(Date.now() + 3_600_000),
      },
      update: {},
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaCatalogSyncRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner?.product.deleteMany({ where: { companyId: COMPANY } });
    await owner?.marketplaceAccount.deleteMany({ where: { id: ACCOUNT } });
    await owner?.company.deleteMany({ where: { id: COMPANY } });
    await owner?.$disconnect();
  });

  const counts = async () => ({
    products: await owner.product.count({ where: { companyId: COMPANY } }),
    variants: await owner.productVariant.count({ where: { companyId: COMPANY } }),
    inventory: await owner.inventory.count({ where: { companyId: COMPANY } }),
    images: await owner.productImage.count({ where: { companyId: COMPANY } }),
    prices: await owner.productPrice.count({ where: { companyId: COMPANY } }),
  });

  it('upsert idempotente: reprocessar não duplica produto/variações/estoque/imagens', async () => {
    const first = await tenant(() => repo.upsertProduct(makeProduct(100)));
    const second = await tenant(() => repo.upsertProduct(makeProduct(100)));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await counts()).toEqual({ products: 1, variants: 2, inventory: 2, images: 1, prices: 1 });
  });

  it('mudança de preço grava nova linha no histórico', async () => {
    await tenant(() => repo.upsertProduct(makeProduct(120)));
    const c = await counts();
    expect(c.products).toBe(1);
    expect(c.prices).toBe(2); // 100 -> 120
  });

  it('30 sincronizações concorrentes do mesmo produto => sem duplicação, sem deadlock', async () => {
    await owner.product.deleteMany({ where: { companyId: COMPANY } });
    const results = await Promise.all(
      Array.from({ length: 30 }, () => tenant(() => repo.upsertProduct(makeProduct(100)))),
    );

    // todas concluíram (retry de conflito) e exatamente 1 reportou created
    expect(results.filter((r) => r.created)).toHaveLength(1);
    const c = await counts();
    expect(c.products).toBe(1);
    expect(c.variants).toBe(2);
    expect(c.inventory).toBe(2);
  });

  it('updateVariantStockAndPrice atualiza estoque/preço', async () => {
    const out = await tenant(() =>
      repo.updateVariantStockAndPrice({
        companyId: COMPANY,
        marketplaceAccountId: ACCOUNT,
        externalId: 'MLB-CAT-1',
        price: 90,
        availableQuantity: 3,
      }),
    );
    expect(out.found).toBe(true);
    const product = await owner.product.findFirst({ where: { companyId: COMPANY } });
    expect(Number(product?.price)).toBe(90);
    expect(product?.availableQuantity).toBe(3);
  });
});
