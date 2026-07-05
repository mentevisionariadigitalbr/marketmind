import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant } from '@marketmind/kernel';
import { PrismaPlanRepository } from '../src/modules/billing/infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '../src/modules/billing/infrastructure/persistence/prisma-subscription.repository';
import { PrismaBillingUsageRepository } from '../src/modules/billing/infrastructure/persistence/prisma-billing-usage.repository';
import { EntitlementsService } from '../src/modules/billing/application/entitlements.service';
import { PLAN_CATALOG, PLAN_CODES } from '../src/modules/billing/domain/plans.catalog';

/**
 * Integration (Fase 5, Inc.1): provisionamento de trial + isolamento RLS da
 * assinatura. Critérios: empresa nova entra em TRIALING (limites do PRO) e a
 * assinatura de uma empresa não vaza para outra.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY_A = 'd1d1d1d1-4444-4444-4444-444444444401';
const COMPANY_B = 'd1d1d1d1-4444-4444-4444-444444444402';

function tenant(companyId: string) {
  return { companyId, userId: `${companyId}-u`, role: 'OWNER' };
}

describe('Billing — trial + RLS (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let service: EntitlementsService;
  let subs: PrismaSubscriptionRepository;

  const clean = async () => {
    await owner.subscription.deleteMany({ where: { companyId: { in: [COMPANY_A, COMPANY_B] } } });
    await owner.company.deleteMany({ where: { id: { in: [COMPANY_A, COMPANY_B] } } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    // Garante os planos do catálogo.
    for (const p of PLAN_CATALOG) {
      await owner.plan.upsert({
        where: { code: p.code },
        create: {
          code: p.code, name: p.name, priceCents: p.priceCents, currency: p.currency,
          interval: p.interval, trialDays: p.trialDays,
          maxMarketplaceAccounts: p.limits.maxMarketplaceAccounts,
          maxProducts: p.limits.maxProducts, historyWindowDays: p.limits.historyWindowDays,
        },
        update: {},
      });
    }
    await clean();
    await owner.company.create({ data: { id: COMPANY_A, name: 'Empresa A' } });
    await owner.company.create({ data: { id: COMPANY_B, name: 'Empresa B' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    subs = new PrismaSubscriptionRepository(prisma);
    service = new EntitlementsService(subs, new PrismaPlanRepository(prisma), new PrismaBillingUsageRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('empresa nova é provisionada em TRIALING com limites do PRO', async () => {
    const ent = await runWithTenant(tenant(COMPANY_A), () => service.getEntitlements());

    expect(ent.status).toBe('TRIALING');
    expect(ent.planCode).toBe(PLAN_CODES.PRO);
    expect(ent.isBlocked).toBe(false);
    expect(ent.limits.maxMarketplaceAccounts).toBe(3);
    expect(ent.trialDaysLeft).toBeGreaterThan(12);
    expect(ent.trialDaysLeft).toBeLessThanOrEqual(14);

    const row = await owner.subscription.findFirst({ where: { companyId: COMPANY_A } });
    expect(row?.status).toBe('TRIALING');
  });

  it('não recria a assinatura em chamadas subsequentes (idempotente)', async () => {
    await runWithTenant(tenant(COMPANY_A), () => service.getEntitlements());
    await runWithTenant(tenant(COMPANY_A), () => service.getEntitlements());
    const rows = await owner.subscription.findMany({ where: { companyId: COMPANY_A } });
    expect(rows).toHaveLength(1);
  });

  it('RLS: a assinatura da empresa A não é visível no contexto da empresa B', async () => {
    // A já tem assinatura (testes anteriores); B ainda não.
    await runWithTenant(tenant(COMPANY_A), () => service.getEntitlements());

    const fromB = await runWithTenant(tenant(COMPANY_B), () => subs.findForCurrentCompany());
    expect(fromB).toBeNull();

    // Leitura sem filtro explícito sob o tenant B não enxerga linhas de A (RLS).
    const visibleToB = await runWithTenant(tenant(COMPANY_B), () =>
      prisma.runInTransaction(() => prisma.db.subscription.findMany()),
    );
    expect(visibleToB.every((s) => s.companyId !== COMPANY_A)).toBe(true);
  });
});
