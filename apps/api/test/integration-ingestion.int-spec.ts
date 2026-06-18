import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { PrismaOrderSyncRepository } from '@marketmind/integration-core';
import { PrismaWebhookEventRepository } from '@marketmind/integration-core';
import { NormalizedOrder } from '@marketmind/integration-core';
import { runWithTenant } from '../src/shared/tenant/tenant-context';

const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = '99999999-9999-9999-9999-999999999999';
const ACCOUNT = 'aaaa0000-0000-0000-0000-000000000001';

function makeOrder(items: NormalizedOrder['items']): NormalizedOrder {
  return {
    companyId: COMPANY,
    marketplaceAccountId: ACCOUNT,
    externalId: '5001',
    status: 'PAID',
    currency: 'BRL',
    grossAmount: 100,
    freightAmount: 15,
    commissionAmount: 10,
    orderedAt: new Date('2026-06-10T12:00:00.000Z'),
    customer: { externalId: '999', nickname: 'COMPRADOR' },
    items,
  };
}

const tenant = <T>(fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId: COMPANY, userId: 'u', role: 'OWNER' }, fn);

describe('Ingestion (integration): idempotência de pedidos e webhooks', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let orderRepo: PrismaOrderSyncRepository;
  let webhookRepo: PrismaWebhookEventRepository;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({
      where: { code: 'MERCADO_LIVRE' },
      create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
      update: {},
    });
    await owner.company.upsert({
      where: { id: COMPANY },
      create: { id: COMPANY, name: 'Ingestão Co' },
      update: {},
    });
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
    orderRepo = new PrismaOrderSyncRepository(prisma);
    webhookRepo = new PrismaWebhookEventRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner?.order.deleteMany({ where: { companyId: COMPANY } });
    await owner?.customer.deleteMany({ where: { companyId: COMPANY } });
    await owner?.webhookEvent.deleteMany({ where: { companyId: COMPANY } });
    await owner?.marketplaceAccount.deleteMany({ where: { id: ACCOUNT } });
    await owner?.company.deleteMany({ where: { id: COMPANY } });
    await owner?.$disconnect();
  });

  it('reimportar o mesmo pedido não duplica (upsert por conta+external_id)', async () => {
    const order = makeOrder([
      { externalItemId: 'MLB1', sku: 'SKU-1', title: 'P1', quantity: 1, unitPrice: 100, itemCommission: 10 },
    ]);

    const first = await tenant(() => orderRepo.upsertOrder(order));
    const second = await tenant(() => orderRepo.upsertOrder(order));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);

    expect(await owner.order.count({ where: { companyId: COMPANY } })).toBe(1);
    expect(await owner.orderItem.count({ where: { companyId: COMPANY } })).toBe(1);
    expect(await owner.customer.count({ where: { companyId: COMPANY } })).toBe(1);
  });

  it('re-sync substitui itens sem duplicar', async () => {
    const updated = makeOrder([
      { externalItemId: 'MLB1', sku: 'SKU-1', title: 'P1', quantity: 3, unitPrice: 100, itemCommission: 10 },
      { externalItemId: 'MLB2', sku: 'SKU-2', title: 'P2', quantity: 1, unitPrice: 50, itemCommission: 5 },
    ]);

    await tenant(() => orderRepo.upsertOrder(updated));

    expect(await owner.order.count({ where: { companyId: COMPANY } })).toBe(1);
    expect(await owner.orderItem.count({ where: { companyId: COMPANY } })).toBe(2);
  });

  it('webhook duplicado é rejeitado pelo dedupeKey', async () => {
    const data = {
      companyId: COMPANY,
      source: 'mercado_livre',
      topic: 'orders_v2',
      resource: '/orders/5001',
      dedupeKey: `ml-test:${COMPANY}:5001`,
      payload: { topic: 'orders_v2' },
    };

    const a = await tenant(() => webhookRepo.recordIfNew(data));
    const b = await tenant(() => webhookRepo.recordIfNew(data));

    expect(a).toBe(true);
    expect(b).toBe(false);
    expect(await owner.webhookEvent.count({ where: { dedupeKey: data.dedupeKey } })).toBe(1);
  });
});
