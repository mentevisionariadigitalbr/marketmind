import { Inject, Injectable, Logger } from '@nestjs/common';
import { PAYMENT_PROVIDER, PaymentProvider } from '../domain/ports/payment-provider.port';
import {
  BILLING_SYNC_REPOSITORY,
  BillingSyncRepository,
} from '../domain/ports/billing-sync.repository';
import { PLAN_REPOSITORY, PlanRepository } from '../domain/ports/plan.repository';
import { BillingEvent } from '../domain/billing-event';

export interface HandleWebhookResult {
  duplicated: boolean;
  handled: boolean;
}

/**
 * Recebe um webhook de cobrança: valida a assinatura, deduplica (recordIfNew —
 * mesmo padrão do webhook do ML) e aplica o efeito. As mutações são idempotentes
 * por id do provedor, então uma entrega duplicada nunca ativa/cobra duas vezes.
 */
@Injectable()
export class HandleBillingWebhookUseCase {
  private readonly logger = new Logger(HandleBillingWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
    @Inject(BILLING_SYNC_REPOSITORY) private readonly sync: BillingSyncRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
  ) {}

  async execute(rawBody: Buffer | string, signature: string): Promise<HandleWebhookResult> {
    // Lança se a assinatura for inválida (o controller responde 400).
    const event = this.payment.parseWebhookEvent(rawBody, signature);

    if (event.type === 'ignored') {
      return { duplicated: false, handled: false };
    }

    const isNew = await this.sync.recordEventIfNew(event.id, event.type, event);
    if (!isNew) {
      return { duplicated: true, handled: false };
    }

    await this.apply(event);
    await this.sync.markEventProcessed(event.id);
    return { duplicated: false, handled: true };
  }

  private async apply(event: BillingEvent): Promise<void> {
    switch (event.type) {
      case 'subscription_activated': {
        if (!event.companyId || !event.planCode) {
          this.logger.warn(`Checkout sem companyId/planCode (event ${event.id}).`);
          return;
        }
        const plan = await this.plans.findByCode(event.planCode);
        if (!plan) {
          this.logger.warn(`Plano "${event.planCode}" inexistente (event ${event.id}).`);
          return;
        }
        await this.sync.activateSubscription({
          companyId: event.companyId,
          planId: plan.id,
          provider: this.payment.name,
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
        });
        return;
      }
      case 'subscription_updated':
        await this.sync.updateSubscriptionByProviderId({
          providerSubscriptionId: event.providerSubscriptionId,
          status: event.status,
          currentPeriodEnd: event.currentPeriodEnd,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        });
        return;
      case 'subscription_canceled':
        await this.sync.cancelByProviderId(event.providerSubscriptionId);
        return;
      case 'invoice_paid': {
        const companyId = await this.sync.findCompanyIdByCustomer(event.providerCustomerId);
        if (!companyId) return;
        await this.sync.upsertInvoice({
          companyId,
          provider: this.payment.name,
          providerInvoiceId: event.providerInvoiceId,
          amountCents: event.amountCents,
          currency: event.currency,
          status: 'PAID',
          paymentMethod: event.paymentMethod,
          hostedUrl: event.hostedUrl,
          paidAt: new Date(),
        });
        return;
      }
      case 'invoice_payment_failed': {
        const companyId = await this.sync.findCompanyIdByCustomer(event.providerCustomerId);
        if (!companyId) return;
        await this.sync.upsertInvoice({
          companyId,
          provider: this.payment.name,
          providerInvoiceId: event.providerInvoiceId,
          amountCents: event.amountCents,
          currency: event.currency,
          status: 'FAILED',
          paymentMethod: null,
          hostedUrl: null,
          paidAt: null,
        });
        await this.sync.markPastDueByCustomer(event.providerCustomerId);
        return;
      }
    }
  }
}
