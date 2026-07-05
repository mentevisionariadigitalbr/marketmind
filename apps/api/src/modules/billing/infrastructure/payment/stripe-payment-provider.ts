import Stripe from 'stripe';
import { BillingNotConfiguredError } from '../../domain/errors';
import { BillingEvent } from '../../domain/billing-event';
import { SubscriptionStatus } from '../../domain/ports/subscription.repository';
import {
  CheckoutSessionParams,
  CreateCustomerParams,
  PaymentProvider,
  PortalSessionParams,
} from '../../domain/ports/payment-provider.port';

/** Status do Stripe → status interno da assinatura. */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}

function asId(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Adapter Stripe (Stripe Billing como system-of-record). Checkout e Customer
 * Portal hospedados; o estado da assinatura é dirigido por webhooks (Inc.3).
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret?: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      metadata: { companyId: params.companyId },
    });
    return { customerId: customer.id };
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: { metadata: params.metadata },
      allow_promotion_codes: true,
    });
    if (!session.url) {
      throw new BillingNotConfiguredError('Stripe não retornou a URL de checkout.');
    }
    return { url: session.url };
  }

  async createPortalSession(params: PortalSessionParams): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  parseWebhookEvent(rawBody: Buffer | string, signature: string): BillingEvent {
    if (!this.webhookSecret) {
      throw new BillingNotConfiguredError('STRIPE_WEBHOOK_SECRET ausente — webhook não verificável.');
    }
    // Lança StripeSignatureVerificationError se a assinatura for inválida.
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    return this.normalize(event);
  }

  private normalize(event: Stripe.Event): BillingEvent {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        return {
          id: event.id,
          type: 'subscription_activated',
          companyId: s.metadata?.companyId ?? '',
          planCode: s.metadata?.planCode ?? '',
          providerCustomerId: asId(s.customer) ?? '',
          providerSubscriptionId: asId(s.subscription) ?? '',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        return {
          id: event.id,
          type: 'subscription_updated',
          providerSubscriptionId: sub.id,
          status: mapStatus(sub.status),
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        };
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        return { id: event.id, type: 'subscription_canceled', providerSubscriptionId: sub.id };
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        return {
          id: event.id,
          type: 'invoice_paid',
          providerCustomerId: asId(inv.customer) ?? '',
          providerSubscriptionId: asId(inv.subscription),
          providerInvoiceId: inv.id,
          amountCents: inv.amount_paid ?? inv.amount_due ?? 0,
          currency: (inv.currency ?? 'brl').toUpperCase(),
          hostedUrl: inv.hosted_invoice_url ?? null,
          paymentMethod: null,
        };
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        return {
          id: event.id,
          type: 'invoice_payment_failed',
          providerCustomerId: asId(inv.customer) ?? '',
          providerSubscriptionId: asId(inv.subscription),
          providerInvoiceId: inv.id,
          amountCents: inv.amount_due ?? 0,
          currency: (inv.currency ?? 'brl').toUpperCase(),
        };
      }
      default:
        return { id: event.id, type: 'ignored', eventType: event.type };
    }
  }
}
