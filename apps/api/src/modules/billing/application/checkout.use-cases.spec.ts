import { CreateCheckoutSessionUseCase } from './create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from './create-portal-session.use-case';
import { EntitlementsService } from './entitlements.service';
import { PlanRecord, PlanRepository } from '../domain/ports/plan.repository';
import {
  CreateTrialData,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import { BillingUsageRepository, UsageCounts } from '../domain/ports/billing-usage.repository';
import {
  CheckoutSessionParams,
  CreateCustomerParams,
  PaymentProvider,
  PortalSessionParams,
} from '../domain/ports/payment-provider.port';
import { BillingNotConfiguredError } from '../domain/errors';
import { ValidationError } from '../../iam/application/errors';

const PRO: PlanRecord = {
  id: 'plan-pro', code: 'PRO', name: 'Pro', priceCents: 9900, currency: 'BRL', interval: 'month',
  trialDays: 14, maxMarketplaceAccounts: 3, maxProducts: 5000, historyWindowDays: 365,
  stripePriceId: 'price_pro', active: true,
};

function subRecord(partial: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    id: 's1', companyId: 'c1', planId: PRO.id, planCode: 'PRO', status: 'TRIALING',
    provider: null, providerCustomerId: null, providerSubscriptionId: null,
    trialEndsAt: new Date(Date.now() + 10 * 86400000), currentPeriodEnd: null, cancelAtPeriodEnd: false,
    ...partial,
  };
}

class FakePlanRepo implements PlanRepository {
  constructor(private readonly plan: PlanRecord | null = PRO) {}
  async listActive() { return this.plan ? [this.plan] : []; }
  async findByCode(code: string) { return this.plan && this.plan.code === code ? this.plan : null; }
  async findById(id: string) { return this.plan && this.plan.id === id ? this.plan : null; }
}

class FakeSubRepo implements SubscriptionRepository {
  current: SubscriptionRecord | null;
  customerSet: { provider: string; customerId: string } | null = null;
  constructor(current: SubscriptionRecord | null) { this.current = current; }
  async findForCurrentCompany() { return this.current; }
  async createTrialIfAbsent(_data: CreateTrialData) { this.current ??= subRecord(); return this.current; }
  async setProviderCustomer(data: { provider: string; customerId: string }) {
    this.customerSet = data;
    if (this.current) this.current = { ...this.current, ...data, providerCustomerId: data.customerId };
  }
}

class FakeUsageRepo implements BillingUsageRepository {
  async countForCurrentCompany(): Promise<UsageCounts> { return { marketplaceAccounts: 0, products: 0 }; }
  async companyCreatedAt() { return new Date(); }
}

class FakePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  createdCustomerFor: CreateCustomerParams | null = null;
  checkoutWith: CheckoutSessionParams | null = null;
  portalWith: PortalSessionParams | null = null;
  async createCustomer(p: CreateCustomerParams) { this.createdCustomerFor = p; return { customerId: 'cus_123' }; }
  async createCheckoutSession(p: CheckoutSessionParams) { this.checkoutWith = p; return { url: 'https://stripe/checkout/x' }; }
  async createPortalSession(p: PortalSessionParams) { this.portalWith = p; return { url: 'https://stripe/portal/x' }; }
  parseWebhookEvent(): never { throw new Error('não usado neste teste'); }
}

function makeCheckout(subs: FakeSubRepo, plans: PlanRepository, pay: FakePaymentProvider) {
  const entitlements = new EntitlementsService(subs, plans, new FakeUsageRepo());
  return new CreateCheckoutSessionUseCase(subs, plans, pay, entitlements);
}

const input = {
  planCode: 'PRO', userEmail: 'a@a.com', companyId: 'c1',
  successUrl: 'http://web/ok', cancelUrl: 'http://web/cancel',
};

describe('CreateCheckoutSessionUseCase', () => {
  it('cria customer (quando ausente) e devolve a URL de checkout', async () => {
    const subs = new FakeSubRepo(subRecord());
    const pay = new FakePaymentProvider();
    const res = await makeCheckout(subs, new FakePlanRepo(), pay).execute(input);

    expect(pay.createdCustomerFor?.email).toBe('a@a.com');
    expect(subs.customerSet?.customerId).toBe('cus_123');
    expect(pay.checkoutWith?.priceId).toBe('price_pro');
    expect(pay.checkoutWith?.metadata).toEqual({ companyId: 'c1', planCode: 'PRO' });
    expect(res.url).toBe('https://stripe/checkout/x');
  });

  it('reaproveita o customer existente (não cria outro)', async () => {
    const subs = new FakeSubRepo(subRecord({ providerCustomerId: 'cus_existing', provider: 'stripe' }));
    const pay = new FakePaymentProvider();
    await makeCheckout(subs, new FakePlanRepo(), pay).execute(input);

    expect(pay.createdCustomerFor).toBeNull();
    expect(pay.checkoutWith?.customerId).toBe('cus_existing');
  });

  it('rejeita plano inexistente', async () => {
    const subs = new FakeSubRepo(subRecord());
    await expect(
      makeCheckout(subs, new FakePlanRepo(null), new FakePaymentProvider()).execute(input),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('falha claramente quando o plano não tem preço no provedor', async () => {
    const subs = new FakeSubRepo(subRecord());
    const noPrice = new FakePlanRepo({ ...PRO, stripePriceId: null });
    await expect(
      makeCheckout(subs, noPrice, new FakePaymentProvider()).execute(input),
    ).rejects.toBeInstanceOf(BillingNotConfiguredError);
  });
});

describe('CreatePortalSessionUseCase', () => {
  it('abre o portal quando há customer', async () => {
    const subs = new FakeSubRepo(subRecord({ providerCustomerId: 'cus_1' }));
    const pay = new FakePaymentProvider();
    const res = await new CreatePortalSessionUseCase(subs, pay).execute({ returnUrl: 'http://web/back' });
    expect(pay.portalWith?.customerId).toBe('cus_1');
    expect(res.url).toBe('https://stripe/portal/x');
  });

  it('rejeita quando ainda não há customer (sem checkout anterior)', async () => {
    const subs = new FakeSubRepo(subRecord({ providerCustomerId: null }));
    await expect(
      new CreatePortalSessionUseCase(subs, new FakePaymentProvider()).execute({ returnUrl: 'x' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
