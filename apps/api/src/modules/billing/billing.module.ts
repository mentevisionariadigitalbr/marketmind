import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IamModule } from '../iam/iam.module';
import { EntitlementsService } from './application/entitlements.service';
import { CreateCheckoutSessionUseCase } from './application/create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from './application/create-portal-session.use-case';
import { HandleBillingWebhookUseCase } from './application/handle-billing-webhook.use-case';
import { BillingController } from './presentation/http/billing.controller';
import { BillingWebhookController } from './presentation/http/billing-webhook.controller';
import { PlanGuard } from './presentation/http/plan.guard';
import { PLAN_REPOSITORY } from './domain/ports/plan.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/ports/subscription.repository';
import { BILLING_USAGE_REPOSITORY } from './domain/ports/billing-usage.repository';
import { BILLING_SYNC_REPOSITORY } from './domain/ports/billing-sync.repository';
import { PAYMENT_PROVIDER, PaymentProvider } from './domain/ports/payment-provider.port';
import { PrismaPlanRepository } from './infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from './infrastructure/persistence/prisma-subscription.repository';
import { PrismaBillingUsageRepository } from './infrastructure/persistence/prisma-billing-usage.repository';
import { PrismaBillingSyncRepository } from './infrastructure/persistence/prisma-billing-sync.repository';
import { StripePaymentProvider } from './infrastructure/payment/stripe-payment-provider';
import { NoopPaymentProvider } from './infrastructure/payment/noop-payment-provider';

/**
 * Módulo de cobrança (Fase 5). Inc.1: planos + trial + entitlements. Inc.2:
 * provedor de pagamento (Stripe) + checkout/portal. Sem STRIPE_SECRET_KEY usa o
 * NoopPaymentProvider (dev/test) — a app sobe, mas checkout/portal falham (503).
 */
@Module({
  imports: [IamModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [
    EntitlementsService,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    HandleBillingWebhookUseCase,
    PlanGuard,
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: PrismaSubscriptionRepository },
    { provide: BILLING_USAGE_REPOSITORY, useClass: PrismaBillingUsageRepository },
    { provide: BILLING_SYNC_REPOSITORY, useClass: PrismaBillingSyncRepository },
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService): PaymentProvider => {
        const key = config.get<string>('STRIPE_SECRET_KEY');
        if (!key) {
          new Logger('BillingModule').warn('STRIPE_SECRET_KEY ausente — checkout/portal desabilitados (NoopPaymentProvider).');
          return new NoopPaymentProvider();
        }
        return new StripePaymentProvider(key, config.get<string>('STRIPE_WEBHOOK_SECRET'));
      },
      inject: [ConfigService],
    },
  ],
  exports: [EntitlementsService, PlanGuard],
})
export class BillingModule {}
