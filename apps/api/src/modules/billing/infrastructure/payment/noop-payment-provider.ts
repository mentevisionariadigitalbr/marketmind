import { BillingNotConfiguredError } from '../../domain/errors';
import { BillingEvent } from '../../domain/billing-event';
import { PaymentProvider } from '../../domain/ports/payment-provider.port';

/**
 * Fallback quando não há STRIPE_SECRET_KEY (dev/test): nenhuma operação de
 * pagamento é possível — falha de forma clara (503) em vez de quebrar o boot.
 * Mesmo padrão do NoopEmailSender.
 */
export class NoopPaymentProvider implements PaymentProvider {
  readonly name = 'noop';

  async createCustomer(): Promise<{ customerId: string }> {
    throw new BillingNotConfiguredError();
  }
  async createCheckoutSession(): Promise<{ url: string }> {
    throw new BillingNotConfiguredError();
  }
  async createPortalSession(): Promise<{ url: string }> {
    throw new BillingNotConfiguredError();
  }
  parseWebhookEvent(): BillingEvent {
    throw new BillingNotConfiguredError();
  }
}
