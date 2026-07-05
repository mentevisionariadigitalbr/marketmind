import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import { PAYMENT_PROVIDER, PaymentProvider } from '../domain/ports/payment-provider.port';
import { ValidationError } from '../../iam/application/errors';

/**
 * Abre o portal do cliente do provedor (trocar cartão, ver faturas, cancelar).
 * Requer um customer já criado (ou seja, ter iniciado um checkout antes).
 */
@Injectable()
export class CreatePortalSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {}

  async execute(input: { returnUrl: string }): Promise<{ url: string }> {
    const sub = await this.subscriptions.findForCurrentCompany();
    if (!sub?.providerCustomerId) {
      throw new ValidationError('Nenhum pagamento configurado ainda. Assine um plano primeiro.');
    }
    return this.payment.createPortalSession({
      customerId: sub.providerCustomerId,
      returnUrl: input.returnUrl,
    });
  }
}
