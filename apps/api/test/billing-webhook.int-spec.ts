import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaBillingSyncRepository } from '../src/modules/billing/infrastructure/persistence/prisma-billing-sync.repository';
import { PrismaPlanRepository } from '../src/modules/billing/infrastructure/persistence/prisma-plan.repository';
import { HandleBillingWebhookUseCase } from '../src/modules/billing/application/handle-billing-webhook.use-case';
import { PaymentProvider } from '../src/modules/billing/domain/ports/payment-provider.port';
import { BillingEvent } from '../src/modules/billing/domain/billing-event';
import { PLAN_CATALOG } from '../src/modules/billing/domain/plans.catalog';

/**
 * Integration (Fase 5, Inc.3): webhook de cobrança idempotente contra Postgres.
 * Critério: entrega duplicada não ativa nem cobra duas vezes.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'e2e2e2e2-5555-5555-5555-555555555501';
const CUSTOMER = 'cus_int_5555';
const SUB_ID = 'sub_int_5555';
const INVOICE_ID = 'in_int_5555';

/** Provedor falso: devolve um evento normalizado pré-montado (sem assinatura). */
class FakeProvider implements PaymentProvider {
  readonly name = 'stripe';
  constructor(public event: BillingEvent) {}
  async createCustomer() { return { customerId: CUSTOMER }; }
  async createCheckoutSession() { return { url: 'x' }; }
  async createPortalSession() { return { url: 'x' }; }
  parseWebhookEvent() { return this.event; }
}

const activated: BillingEvent = {
  id: 'evt_int_act', type: 'subscription_activated', companyId: COMPANY, planCode: 'PRO',
  providerCustomerId: CUSTOMER, providerSubscriptionId: SUB_ID, currentPeriodEnd: null, cancelAtPeriodEnd: false,
};
const paid: BillingEvent = {
  id: 'evt_int_paid', type: 'invoice_paid', providerCustomerId: CUSTOMER, providerSubscriptionId: SUB_ID,
  providerInvoiceId: INVOICE_ID, amountCents: 9900, currency: 'BRL', hostedUrl: null, paymentMethod: 'card',
};

describe('Billing webhook — idempotência (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let provider: FakeProvider;
  let uc: HandleBillingWebhookUseCase;

  const clean = async () => {
    await owner.$executeRawUnsafe(`DELETE FROM webhook_events WHERE dedupe_key LIKE 'stripe:evt_int_%'`);
    await owner.invoice.deleteMany({ where: { companyId: COMPANY } });
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
    await clean();
    const pro = await owner.plan.findUnique({ where: { code: 'PRO' } });
    await owner.company.create({ data: { id: COMPANY, name: 'Co Webhook' } });
    await owner.subscription.create({
      data: { companyId: COMPANY, planId: pro!.id, status: 'TRIALING', trialEndsAt: new Date(Date.now() + 1e9) },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    provider = new FakeProvider(activated);
    uc = new HandleBillingWebhookUseCase(provider, new PrismaBillingSyncRepository(prisma), new PrismaPlanRepository(prisma));
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('checkout.completed ativa a assinatura; reentrega é deduplicada (1x)', async () => {
    provider.event = activated;
    const first = await uc.execute('raw', 'sig');
    const second = await uc.execute('raw', 'sig');

    expect(first).toEqual({ duplicated: false, handled: true });
    expect(second).toEqual({ duplicated: true, handled: false });

    const sub = await owner.subscription.findFirst({ where: { companyId: COMPANY } });
    expect(sub?.status).toBe('ACTIVE');
    expect(sub?.providerSubscriptionId).toBe(SUB_ID);
    expect(sub?.providerCustomerId).toBe(CUSTOMER);
  });

  it('invoice.paid registra UMA fatura mesmo com entrega duplicada', async () => {
    provider.event = paid;
    await uc.execute('raw', 'sig');
    await uc.execute('raw', 'sig'); // duplicado

    const invoices = await owner.invoice.findMany({ where: { companyId: COMPANY } });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ providerInvoiceId: INVOICE_ID, status: 'PAID', amountCents: 9900 });
  });
});
