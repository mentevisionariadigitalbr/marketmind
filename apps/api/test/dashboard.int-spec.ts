import { randomUUID } from 'node:crypto';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { runWithTenant } from '@marketmind/kernel';
import { PermissionsGuard } from '../src/modules/iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../src/modules/iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../src/modules/iam/domain/permissions';
import { DashboardService } from '../src/modules/dashboard/application/dashboard.service';
import { PrismaDashboardQueryRepository } from '../src/modules/dashboard/infrastructure/prisma-dashboard-query.repository';
import { InMemoryDashboardCache } from '../src/modules/dashboard/infrastructure/cache/in-memory-cache';
import { DashboardMetrics } from '../src/modules/dashboard/infrastructure/metrics/dashboard-metrics';

/**
 * Integration test do Dashboard (Sprint 3.2) — exercita o DashboardService real
 * com o adapter Prisma real (SQL real) contra Postgres real, sob RLS:
 *   RLS · multi-tenant · paginação · filtros · ordenação · cache. RBAC é validado
 * com o PermissionsGuard real. Segue o padrão dos demais *.int-spec (sem bootar a
 * app inteira/BullMQ, evitando hangs de open-handles).
 */
const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = 'a1111111-1111-1111-1111-111111111111';
const TENANT_B = 'b2222222-2222-2222-2222-222222222222';
const ACCOUNT_A = 'a1110000-0000-0000-0000-000000000001';
const ACCOUNT_B = 'b2220000-0000-0000-0000-000000000001';

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);
const asTenant = <T>(companyId: string, fn: () => Promise<T>): Promise<T> =>
  runWithTenant({ companyId, userId: `${companyId}-u`, role: 'OWNER' }, fn);

interface SeedProduct {
  id: string; sku: string; title: string; status: string; price: number; stock: number; sold: number;
}

async function seedTenant(
  owner: PrismaClient, marketplaceId: string, companyId: string, accountId: string, prefix: string, products: SeedProduct[],
): Promise<void> {
  await owner.company.upsert({ where: { id: companyId }, create: { id: companyId, name: `Co ${prefix}` }, update: {} });
  await owner.marketplaceAccount.upsert({
    where: { id: accountId },
    create: { id: accountId, companyId, marketplaceId, externalUserId: `${prefix}-user`, accessTokenEnc: 'enc', refreshTokenEnc: 'enc', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    update: {},
  });
  for (const [i, p] of products.entries()) {
    await owner.product.create({
      data: { id: p.id, companyId, marketplaceAccountId: accountId, externalId: `${prefix}-EXT-${i}`, sku: p.sku, title: p.title, status: p.status, price: p.price, availableQuantity: p.stock },
    });
    const variantId = randomUUID();
    await owner.productVariant.create({ data: { id: variantId, companyId, productId: p.id, externalId: `${prefix}-VAR-${i}`, sku: p.sku, price: p.price } });
    await owner.inventory.create({ data: { companyId, productId: p.id, variantId, available: p.stock, reserved: 0 } });
    if (p.sold > 0) {
      const order = await owner.order.create({
        data: { companyId, marketplaceAccountId: accountId, externalId: `${prefix}-ORD-${i}`, status: 'PAID', grossAmount: p.price * p.sold, freightAmount: 10, commissionAmount: p.price * p.sold * 0.1, orderedAt: recent(2 + i) },
      });
      await owner.orderItem.create({
        data: { companyId, orderId: order.id, productId: p.id, externalItemId: `${prefix}-ITEM-${i}`, sku: p.sku, title: p.title, quantity: p.sold, unitPrice: p.price },
      });
    }
  }
}

async function cleanup(owner: PrismaClient): Promise<void> {
  for (const company of [TENANT_A, TENANT_B]) {
    await owner.orderItem.deleteMany({ where: { companyId: company } });
    await owner.order.deleteMany({ where: { companyId: company } });
    await owner.inventory.deleteMany({ where: { companyId: company } });
    await owner.productVariant.deleteMany({ where: { companyId: company } });
    await owner.product.deleteMany({ where: { companyId: company } });
    await owner.marketplaceAccount.deleteMany({ where: { companyId: company } });
    await owner.customer.deleteMany({ where: { companyId: company } });
    await owner.company.deleteMany({ where: { id: company } });
  }
}

const productsA: SeedProduct[] = [
  { id: 'aaaa1111-1111-1111-1111-111111111101', sku: 'AAA-1', title: 'Camiseta', status: 'active', price: 100, stock: 50, sold: 5 },
  { id: 'aaaa1111-1111-1111-1111-111111111102', sku: 'AAA-2', title: 'Boné', status: 'active', price: 50, stock: 3, sold: 2 },
  { id: 'aaaa1111-1111-1111-1111-111111111103', sku: 'AAA-3', title: 'Meia', status: 'paused', price: 20, stock: 0, sold: 0 },
];
const productsB: SeedProduct[] = [
  { id: 'bbbb2222-2222-2222-2222-222222222201', sku: 'BBB-1', title: 'Tênis', status: 'active', price: 300, stock: 10, sold: 4 },
];

describe('Dashboard (integration): RLS · RBAC · paginação · filtros · cache · multi-tenant', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let service: DashboardService;
  let metrics: DashboardMetrics;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await cleanup(owner);
    await seedTenant(owner, ml.id, TENANT_A, ACCOUNT_A, 'A', productsA);
    await seedTenant(owner, ml.id, TENANT_B, ACCOUNT_B, 'B', productsB);

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    metrics = new DashboardMetrics();
    service = new DashboardService(new PrismaDashboardQueryRepository(prisma), new InMemoryDashboardCache(), prisma, metrics);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await cleanup(owner);
    await owner?.$disconnect();
  });

  // ---- RBAC (PermissionsGuard real) ----
  class FakeController {
    @RequirePermissions(PERMISSIONS.DASHBOARD_READ)
    handler() {}
  }
  const guardCtx = (permissions: string[]): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
      getHandler: () => FakeController.prototype.handler,
      getClass: () => FakeController,
    }) as unknown as ExecutionContext;

  it('RBAC: sem dashboard:read → Forbidden', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(() => guard.canActivate(guardCtx([PERMISSIONS.INVENTORY_READ]))).toThrow(ForbiddenException);
  });

  it('RBAC: com dashboard:read → permitido', () => {
    const guard = new PermissionsGuard(new Reflector());
    expect(guard.canActivate(guardCtx([PERMISSIONS.DASHBOARD_READ]))).toBe(true);
  });

  // ---- RLS / multi-tenant ----
  it('multi-tenant + RLS: A vê só produtos de A', async () => {
    const page = await asTenant(TENANT_A, () => service.products({ preset: '30d' }, {}, { page: 1, pageSize: 50 }));
    const skus = page.items.map((p) => p.sku);
    expect(skus).toEqual(expect.arrayContaining(['AAA-1', 'AAA-2', 'AAA-3']));
    expect(skus).not.toContain('BBB-1');
    expect(page.total).toBe(3);
  });

  it('multi-tenant: B vê só o seu produto', async () => {
    const page = await asTenant(TENANT_B, () => service.products({ preset: '30d' }, {}, { page: 1, pageSize: 50 }));
    expect(page.total).toBe(1);
    expect(page.items[0].sku).toBe('BBB-1');
  });

  // ---- Paginação / ordenação / filtros ----
  it('paginação: pageSize=2 → 2 itens, total 3, ordenação por receita desc', async () => {
    const page = await asTenant(TENANT_A, () => service.products({ preset: '30d' }, {}, { page: 1, pageSize: 2 }));
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
    expect(page.totalPages).toBe(2);
    const revenues = page.items.map((p) => p.revenue);
    expect(revenues[0]).toBeGreaterThanOrEqual(revenues[1]); // desc
    expect(revenues[0]).toBe(500); // AAA-1: 5×100
  });

  it('filtro status=active exclui o pausado; filtro sku parcial', async () => {
    const active = await asTenant(TENANT_A, () => service.products({ preset: '30d' }, { status: 'active' }, { page: 1, pageSize: 50 }));
    expect(active.items.map((p) => p.sku)).not.toContain('AAA-3');
    const bySku = await asTenant(TENANT_A, () => service.products({ preset: '30d' }, { sku: 'AAA-1' }, { page: 1, pageSize: 50 }));
    expect(bySku.items).toHaveLength(1);
    expect(bySku.items[0].sku).toBe('AAA-1');
  });

  // ---- Overview / inventory / abc ----
  it('overview: 12 KPIs, lucro bloqueado (needs-table)', async () => {
    const ov = await asTenant(TENANT_A, () => service.overview());
    expect(ov.kpis).toHaveLength(12);
    expect(ov.kpis.find((k) => k.key === 'profit.gross')?.availability).toBe('needs-table');
  });

  it('inventory: detecta sem-estoque e valor a custo nulo', async () => {
    const inv = await asTenant(TENANT_A, () => service.inventory({ preset: '30d' }));
    expect(inv.productsWithoutStock).toBeGreaterThanOrEqual(1);
    expect(inv.valueAtCost).toBeNull();
  });

  it('abc: classifica produtos com receita', async () => {
    const abc = await asTenant(TENANT_A, () => service.abc({ preset: '90d' }));
    expect(abc.entries.length).toBeGreaterThanOrEqual(2);
  });

  // ---- Cache ----
  it('cache: 2ª chamada idêntica + cache_hit registrado nas métricas', async () => {
    const first = await asTenant(TENANT_A, () => service.revenue({ preset: '30d' }));
    const second = await asTenant(TENANT_A, () => service.revenue({ preset: '30d' }));
    expect(second).toEqual(first);
    const dump = await metrics.expose();
    expect(dump).toMatch(/dashboard_cache_hits\{endpoint="revenue"\}\s+[1-9]/);
  });
});
