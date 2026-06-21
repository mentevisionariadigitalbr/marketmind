import { computeEntitlements } from '../domain/entitlements';
import { EntitlementsService } from './entitlements.service';
import { PlanRecord, PlanRepository } from '../domain/ports/plan.repository';
import {
  CreateTrialData,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import { BillingUsageRepository, UsageCounts } from '../domain/ports/billing-usage.repository';
import { PLAN_CODES } from '../domain/plans.catalog';

const PRO: PlanRecord = {
  id: 'plan-pro',
  code: PLAN_CODES.PRO,
  name: 'Pro',
  priceCents: 9900,
  currency: 'BRL',
  interval: 'month',
  trialDays: 14,
  maxMarketplaceAccounts: 3,
  maxProducts: 5000,
  historyWindowDays: 365,
  stripePriceId: 'price_pro',
  active: true,
};

function sub(partial: Partial<SubscriptionRecord>): SubscriptionRecord {
  return {
    id: 's1',
    companyId: 'c1',
    planId: PRO.id,
    planCode: PRO.code,
    status: 'TRIALING',
    provider: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...partial,
  };
}

const usage: UsageCounts = { marketplaceAccounts: 1, products: 10 };
const NOW = new Date('2026-06-22T12:00:00Z');

describe('computeEntitlements (pure)', () => {
  it('trial ativo concede os limites do plano e conta os dias restantes', () => {
    const trialEndsAt = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000);
    const e = computeEntitlements(sub({ status: 'TRIALING', trialEndsAt }), PRO, usage, NOW);
    expect(e.isBlocked).toBe(false);
    expect(e.trialDaysLeft).toBe(5);
    expect(e.limits.maxMarketplaceAccounts).toBe(3);
    expect(e.usage.products).toBe(10);
  });

  it('trial expirado bloqueia e zera os limites', () => {
    const trialEndsAt = new Date(NOW.getTime() - 1000);
    const e = computeEntitlements(sub({ status: 'TRIALING', trialEndsAt }), PRO, usage, NOW);
    expect(e.isBlocked).toBe(true);
    expect(e.trialDaysLeft).toBe(0);
    expect(e.limits.maxMarketplaceAccounts).toBe(0);
    expect(e.limits.maxProducts).toBe(0);
  });

  it('assinatura ATIVA concede os limites do plano', () => {
    const e = computeEntitlements(sub({ status: 'ACTIVE', trialEndsAt: null }), PRO, usage, NOW);
    expect(e.isBlocked).toBe(false);
    expect(e.trialDaysLeft).toBeNull();
    expect(e.limits.maxProducts).toBe(5000);
  });

  it.each(['PAST_DUE', 'CANCELED', 'INCOMPLETE'] as const)('status %s bloqueia o acesso', (status) => {
    const e = computeEntitlements(sub({ status }), PRO, usage, NOW);
    expect(e.isBlocked).toBe(true);
    expect(e.limits.maxMarketplaceAccounts).toBe(0);
  });
});

// ───────── Fakes em memória para o serviço ─────────
class FakePlanRepo implements PlanRepository {
  async listActive() {
    return [PRO];
  }
  async findByCode(code: string) {
    return code === PRO.code ? PRO : null;
  }
  async findById(id: string) {
    return id === PRO.id ? PRO : null;
  }
}

class FakeSubRepo implements SubscriptionRepository {
  current: SubscriptionRecord | null = null;
  createdWith: CreateTrialData | null = null;
  async findForCurrentCompany() {
    return this.current;
  }
  async createTrialIfAbsent(data: CreateTrialData) {
    this.createdWith = data;
    this.current = sub({ status: 'TRIALING', planId: data.planId, trialEndsAt: data.trialEndsAt });
    return this.current;
  }
  async setProviderCustomer(data: { provider: string; customerId: string }) {
    if (this.current) {
      this.current = { ...this.current, provider: data.provider, providerCustomerId: data.customerId };
    }
  }
}

class FakeUsageRepo implements BillingUsageRepository {
  constructor(private readonly createdAt: Date | null) {}
  async countForCurrentCompany() {
    return usage;
  }
  async companyCreatedAt() {
    return this.createdAt;
  }
}

describe('EntitlementsService', () => {
  it('provisiona trial preguiçosamente ancorado no createdAt da empresa', async () => {
    const subs = new FakeSubRepo();
    const created = new Date('2026-06-20T00:00:00Z');
    const service = new EntitlementsService(subs, new FakePlanRepo(), new FakeUsageRepo(created));

    const ent = await service.getEntitlements();

    expect(subs.createdWith).not.toBeNull();
    // trialEndsAt = createdAt + 14 dias
    expect(subs.createdWith!.trialEndsAt.toISOString()).toBe('2026-07-04T00:00:00.000Z');
    expect(ent.planCode).toBe(PLAN_CODES.PRO);
    expect(ent.status).toBe('TRIALING');
  });

  it('não recria a assinatura quando já existe', async () => {
    const subs = new FakeSubRepo();
    subs.current = sub({ status: 'ACTIVE', trialEndsAt: null });
    const service = new EntitlementsService(subs, new FakePlanRepo(), new FakeUsageRepo(null));

    const ent = await service.getEntitlements();

    expect(subs.createdWith).toBeNull();
    expect(ent.isBlocked).toBe(false);
    expect(ent.status).toBe('ACTIVE');
  });
});
