import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant } from '@marketmind/kernel';
import { PrismaPlanRepository } from '../src/modules/billing/infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '../src/modules/billing/infrastructure/persistence/prisma-subscription.repository';
import { PrismaBillingUsageRepository } from '../src/modules/billing/infrastructure/persistence/prisma-billing-usage.repository';
import { EntitlementsService } from '../src/modules/billing/application/entitlements.service';
import { SubscriptionRequiredError } from '../src/modules/billing/domain/errors';
import { PLAN_CATALOG } from '../src/modules/billing/domain/plans.catalog';

/**
 * Integration (Fase 5, Inc.4): paywall contra Postgres. Critério: trial expirado
 * bloqueia (exige assinatura); assinatura ativa libera dentro do limite.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'f3f3f3f3-6666-6666-6666-666666666601';

function tenant() {
  return { companyId: COMPANY, userId: `${COMPANY}-u`, role: 'OWNER' };
}

describe('Billing gating — paywall (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let service: EntitlementsService;
  let proId: string;

  const clean = async () => {
    await owner.subscription.deleteMany({ where: { companyId: COMPANY } });
    await owner.company.deleteMany({ where: { id: COMPANY } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    for (const p of PLAN_CATALOG) {
      await owner.plan.upsert({
        where: { code: p.code },
        create: {
          code: p.code, name: p.name, priceCents: p.priceCents, currency: p.currency, interval: p.interval,
          trialDays: p.trialDays, maxMarketplaceAccounts: p.limits.maxMarketplaceAccounts,
          maxProducts: p.limits.maxProducts, historyWindowDays: p.limits.historyWindowDays,
        },
        update: {},
      });
    }
    proId = (await owner.plan.findUnique({ where: { code: 'PRO' } }))!.id;
    await clean();
    await owner.company.create({ data: { id: COMPANY, name: 'Co Gating' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    service = new EntitlementsService(
      new PrismaSubscriptionRepository(prisma),
      new PrismaPlanRepository(prisma),
      new PrismaBillingUsageRepository(prisma),
    );
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('trial expirado bloqueia (assertNotBlocked exige assinatura)', async () => {
    await owner.subscription.create({
      data: { companyId: COMPANY, planId: proId, status: 'TRIALING', trialEndsAt: new Date(Date.now() - 86400000) },
    });

    const ent = await runWithTenant(tenant(), () => service.getEntitlements());
    expect(ent.isBlocked).toBe(true);
    expect(ent.limits.maxMarketplaceAccounts).toBe(0);

    await expect(runWithTenant(tenant(), () => service.assertNotBlocked())).rejects.toBeInstanceOf(
      SubscriptionRequiredError,
    );
  });

  it('assinatura ativa libera e respeita o limite (0/3 contas → ok)', async () => {
    await owner.subscription.update({
      where: { companyId: COMPANY },
      data: { status: 'ACTIVE', trialEndsAt: null },
    });

    const ent = await runWithTenant(tenant(), () => service.getEntitlements());
    expect(ent.isBlocked).toBe(false);
    expect(ent.limits.maxMarketplaceAccounts).toBe(3);

    await expect(
      runWithTenant(tenant(), () => service.assertWithinLimit('marketplace_accounts')),
    ).resolves.toBeUndefined();
  });
});
