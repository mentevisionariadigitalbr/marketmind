import { SubscriptionStatus } from './ports/subscription.repository';

/**
 * Evento de cobrança NORMALIZADO (independente do provedor). O adapter traduz os
 * eventos do Stripe para esta união; os casos de uso só lidam com isto.
 */
export type BillingEvent =
  | {
      id: string;
      type: 'subscription_activated';
      companyId: string;
      planCode: string;
      providerCustomerId: string;
      providerSubscriptionId: string;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    }
  | {
      id: string;
      type: 'subscription_updated';
      providerSubscriptionId: string;
      status: SubscriptionStatus;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    }
  | { id: string; type: 'subscription_canceled'; providerSubscriptionId: string }
  | {
      id: string;
      type: 'invoice_paid';
      providerCustomerId: string;
      providerSubscriptionId: string | null;
      providerInvoiceId: string;
      amountCents: number;
      currency: string;
      hostedUrl: string | null;
      paymentMethod: string | null;
    }
  | {
      id: string;
      type: 'invoice_payment_failed';
      providerCustomerId: string;
      providerSubscriptionId: string | null;
      providerInvoiceId: string;
      amountCents: number;
      currency: string;
    }
  | { id: string; type: 'ignored'; eventType: string };
