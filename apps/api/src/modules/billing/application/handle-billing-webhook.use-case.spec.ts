import { HandleBillingWebhookUseCase } from './handle-billing-webhook.use-case';
import { PlanRecord, PlanRepository } from '../domain/ports/plan.repository';
import {
  ActivateSubscriptionData,
  BillingSyncRepository,
  UpdateSubscriptionData,
  UpsertInvoiceData,
} from '../domain/ports/billing-sync.repository';
import { PaymentProvider } from '../domain/ports/payment-provider.port';
import { BillingEvent } from '../domain/billing-event';

const PRO: PlanRecord = {
  id: 'plan-pro', code: 'PRO', name: 'Pro', priceCents: 9900, currency: 'BRL', interval: 'month',
  trialDays: 14, maxMarketplaceAccounts: 3, maxProducts: 5000, historyWindowDays: 365,
  stripePriceId: 'price_pro', active: true,
};

class FakePlanRepo implements PlanRepository {
  async listActive() { return [PRO]; }
  async findByCode(code: string) { return code === 'PRO' ? PRO : null; }
  async findById(id: string) { return id === PRO.id ? PRO : null; }
}

class FakeSync implements BillingSyncRepository {
  seen = new Set<string>();
  processed: string[] = [];
  activate: ActivateSubscriptionData[] = [];
  updates: UpdateSubscriptionData[] = [];
  canceled: string[] = [];
  pastDue: string[] = [];
  invoices: UpsertInvoiceData[] = [];

  async recordEventIfNew(eventId: string) {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
  async markEventProcessed(eventId: string) { this.processed.push(eventId); }
  async activateSubscription(d: ActivateSubscriptionData) { this.activate.push(d); }
  async updateSubscriptionByProviderId(d: UpdateSubscriptionData) { this.updates.push(d); }
  async cancelByProviderId(id: string) { this.canceled.push(id); }
  async markPastDueByCustomer(id: string) { this.pastDue.push(id); }
  async findCompanyIdByCustomer() { return 'c1'; }
  async upsertInvoice(d: UpsertInvoiceData) {
    const i = this.invoices.findIndex((x) => x.providerInvoiceId === d.providerInvoiceId);
    if (i >= 0) this.invoices[i] = d; else this.invoices.push(d);
  }
}

class FakeProvider implements PaymentProvider {
  readonly name = 'stripe';
  constructor(private event: BillingEvent) {}
  setEvent(e: BillingEvent) { this.event = e; }
  async createCustomer() { return { customerId: 'cus' }; }
  async createCheckoutSession() { return { url: 'x' }; }
  async createPortalSession() { return { url: 'x' }; }
  parseWebhookEvent() { return this.event; }
}

function make(event: BillingEvent) {
  const sync = new FakeSync();
  const provider = new FakeProvider(event);
  const uc = new HandleBillingWebhookUseCase(provider, sync, new FakePlanRepo());
  return { uc, sync, provider };
}

const activated: BillingEvent = {
  id: 'evt_1', type: 'subscription_activated', companyId: 'c1', planCode: 'PRO',
  providerCustomerId: 'cus_1', providerSubscriptionId: 'sub_1', currentPeriodEnd: null, cancelAtPeriodEnd: false,
};

describe('HandleBillingWebhookUseCase', () => {
  it('checkout concluído ativa a assinatura com o plano correto', async () => {
    const { uc, sync } = make(activated);
    const res = await uc.execute('raw', 'sig');
    expect(res).toEqual({ duplicated: false, handled: true });
    expect(sync.activate).toHaveLength(1);
    expect(sync.activate[0]).toMatchObject({ companyId: 'c1', planId: 'plan-pro', providerSubscriptionId: 'sub_1' });
    expect(sync.processed).toEqual(['evt_1']);
  });

  it('IDEMPOTÊNCIA: evento duplicado não ativa duas vezes', async () => {
    const { uc, sync } = make(activated);
    await uc.execute('raw', 'sig');
    const second = await uc.execute('raw', 'sig');
    expect(second).toEqual({ duplicated: true, handled: false });
    expect(sync.activate).toHaveLength(1); // só uma ativação
  });

  it('assinatura cancelada rebaixa pelo id do provedor', async () => {
    const { uc, sync } = make({ id: 'evt_c', type: 'subscription_canceled', providerSubscriptionId: 'sub_1' });
    await uc.execute('raw', 'sig');
    expect(sync.canceled).toEqual(['sub_1']);
  });

  it('falha de pagamento cria fatura FAILED e marca PAST_DUE', async () => {
    const { uc, sync } = make({
      id: 'evt_f', type: 'invoice_payment_failed', providerCustomerId: 'cus_1',
      providerSubscriptionId: 'sub_1', providerInvoiceId: 'in_1', amountCents: 9900, currency: 'BRL',
    });
    await uc.execute('raw', 'sig');
    expect(sync.invoices[0]).toMatchObject({ providerInvoiceId: 'in_1', status: 'FAILED' });
    expect(sync.pastDue).toEqual(['cus_1']);
  });

  it('fatura paga é registrada uma única vez mesmo com reentrega', async () => {
    const paid: BillingEvent = {
      id: 'evt_p', type: 'invoice_paid', providerCustomerId: 'cus_1', providerSubscriptionId: 'sub_1',
      providerInvoiceId: 'in_9', amountCents: 9900, currency: 'BRL', hostedUrl: null, paymentMethod: 'card',
    };
    const { uc, sync } = make(paid);
    await uc.execute('raw', 'sig');
    await uc.execute('raw', 'sig'); // duplicado
    expect(sync.invoices).toHaveLength(1);
    expect(sync.invoices[0]).toMatchObject({ providerInvoiceId: 'in_9', status: 'PAID' });
  });

  it('evento ignorado não deduplica nem altera estado', async () => {
    const { uc, sync } = make({ id: 'evt_x', type: 'ignored', eventType: 'customer.created' });
    const res = await uc.execute('raw', 'sig');
    expect(res).toEqual({ duplicated: false, handled: false });
    expect(sync.seen.size).toBe(0);
  });
});
