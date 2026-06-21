import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanRepository } from '../domain/ports/plan.repository';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import { PAYMENT_PROVIDER, PaymentProvider } from '../domain/ports/payment-provider.port';
import { EntitlementsService } from './entitlements.service';
import { BillingNotConfiguredError } from '../domain/errors';
import { ValidationError } from '../../iam/application/errors';

export interface CreateCheckoutInput {
  planCode: string;
  /** E-mail do usuário corrente (para o customer do provedor). */
  userEmail: string;
  companyId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Inicia a assinatura (converte o trial sem cartão): garante a assinatura/cliente
 * no provedor e devolve a URL de checkout hospedada. A ativação efetiva ocorre via
 * webhook (Inc.3).
 */
@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
    private readonly entitlements: EntitlementsService,
  ) {}

  async execute(input: CreateCheckoutInput): Promise<{ url: string }> {
    const plan = await this.plans.findByCode(input.planCode);
    if (!plan || !plan.active) {
      throw new ValidationError('Plano inválido.');
    }
    if (!plan.stripePriceId) {
      throw new BillingNotConfiguredError(`Plano "${plan.code}" sem preço configurado no provedor.`);
    }

    // Garante a assinatura do tenant (trial) e reaproveita o customer, se houver.
    const sub = await this.entitlements.ensureSubscription();
    let customerId = sub.providerCustomerId;
    if (!customerId) {
      const created = await this.payment.createCustomer({ email: input.userEmail, companyId: input.companyId });
      customerId = created.customerId;
      await this.subscriptions.setProviderCustomer({ provider: this.payment.name, customerId });
    }

    return this.payment.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: { companyId: input.companyId, planCode: plan.code },
    });
  }
}
