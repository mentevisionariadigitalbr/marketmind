import { EntitlementsService } from './entitlements.service';
import { PlanGuard } from '../presentation/http/plan.guard';
import { PlanRecord, PlanRepository } from '../domain/ports/plan.repository';
import {
  CreateTrialData,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import { BillingUsageRepository, UsageCounts } from '../domain/ports/billing-usage.repository';
import { PlanLimitExceededError, SubscriptionRequiredError } from '../domain/errors';
import type { ExecutionContext } from '@nestjs/common';

const PRO: PlanRecord = {
  id: 'plan-pro', code: 'PRO', name: 'Pro', priceCents: 9900, currency: 'BRL', interval: 'month',
  trialDays: 14, maxMarketplaceAccounts: 3, maxProducts: 5000, historyWindowDays: 365,
  stripePriceId: 'price_pro', active: true,
};

class FakePlanRepo implements PlanRepository {
  async listActive() { return [PRO]; }
  async findByCode(c: string) { return c === 'PRO' ? PRO : null; }
  async findById(i: string) { return i === PRO.id ? PRO : null; }
}

class FixedSubRepo implements SubscriptionRepository {
  constructor(private readonly rec: SubscriptionRecord) {}
  async findForCurrentCompany() { return this.rec; }
  async createTrialIfAbsent(_d: CreateTrialData) { return this.rec; }
  async setProviderCustomer() { /* noop */ }
}

class FixedUsageRepo implements BillingUsageRepository {
  constructor(private readonly counts: UsageCounts) {}
  async countForCurrentCompany() { return this.counts; }
  async companyCreatedAt() { return new Date(); }
}

function sub(partial: Partial<SubscriptionRecord>): SubscriptionRecord {
  return {
    id: 's', companyId: 'c1', planId: PRO.id, planCode: 'PRO', status: 'ACTIVE',
    provider: 'stripe', providerCustomerId: 'cus', providerSubscriptionId: 'sub',
    trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, ...partial,
  };
}

function service(rec: SubscriptionRecord, counts: UsageCounts) {
  return new EntitlementsService(new FixedSubRepo(rec), new FakePlanRepo(), new FixedUsageRepo(counts));
}

const expiredTrial = sub({ status: 'TRIALING', trialEndsAt: new Date(Date.now() - 1000), providerCustomerId: null });

describe('EntitlementsService — gating', () => {
  it('assertWithinLimit resolve quando há folga', async () => {
    await expect(
      service(sub({}), { marketplaceAccounts: 1, products: 10 }).assertWithinLimit('marketplace_accounts'),
    ).resolves.toBeUndefined();
  });

  it('assertWithinLimit lança 402 ao atingir o limite', async () => {
    await expect(
      service(sub({}), { marketplaceAccounts: 3, products: 10 }).assertWithinLimit('marketplace_accounts'),
    ).rejects.toBeInstanceOf(PlanLimitExceededError);
  });

  it('assertWithinLimit em conta bloqueada exige assinatura', async () => {
    await expect(
      service(expiredTrial, { marketplaceAccounts: 0, products: 0 }).assertWithinLimit('marketplace_accounts'),
    ).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });

  it('produtos ilimitados (limit null) nunca excedem', async () => {
    const business = { ...PRO, code: 'BUSINESS', maxProducts: null };
    const svc = new EntitlementsService(
      new FixedSubRepo(sub({ planId: business.id, planCode: 'BUSINESS' })),
      { listActive: async () => [business], findByCode: async () => business, findById: async () => business },
      new FixedUsageRepo({ marketplaceAccounts: 0, products: 999999 }),
    );
    await expect(svc.assertWithinLimit('products')).resolves.toBeUndefined();
  });

  it('assertNotBlocked: ativo passa, bloqueado lança', async () => {
    await expect(service(sub({}), { marketplaceAccounts: 0, products: 0 }).assertNotBlocked()).resolves.toBeUndefined();
    await expect(
      service(expiredTrial, { marketplaceAccounts: 0, products: 0 }).assertNotBlocked(),
    ).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });
});

describe('PlanGuard', () => {
  const ctx = (user: unknown): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

  it('libera quando não há usuário (rota pública)', async () => {
    const guard = new PlanGuard(service(sub({}), { marketplaceAccounts: 0, products: 0 }));
    await expect(guard.canActivate(ctx(undefined))).resolves.toBe(true);
  });

  it('libera empresa ativa', async () => {
    const guard = new PlanGuard(service(sub({}), { marketplaceAccounts: 0, products: 0 }));
    await expect(guard.canActivate(ctx({ companyId: 'c1' }))).resolves.toBe(true);
  });

  it('bloqueia empresa com trial expirado', async () => {
    const guard = new PlanGuard(service(expiredTrial, { marketplaceAccounts: 0, products: 0 }));
    await expect(guard.canActivate(ctx({ companyId: 'c1' }))).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });
});
