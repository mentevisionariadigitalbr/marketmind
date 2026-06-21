import { Inject, Injectable } from '@nestjs/common';
import { runWithTenant } from '@marketmind/kernel';
import { PLAN_REPOSITORY, PlanRepository } from '../domain/ports/plan.repository';
import { PlanLimitExceededError, SubscriptionRequiredError } from '../domain/errors';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRecord,
  SubscriptionRepository,
} from '../domain/ports/subscription.repository';
import {
  BILLING_USAGE_REPOSITORY,
  BillingUsageRepository,
} from '../domain/ports/billing-usage.repository';
import { computeEntitlements, Entitlements } from '../domain/entitlements';
import { TRIAL_DAYS, TRIAL_PLAN_CODE } from '../domain/plans.catalog';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve os direitos (entitlements) da empresa corrente. Garante a assinatura de
 * trial (provisionamento preguiçoso, ancorado no createdAt da empresa) para que o
 * IAM permaneça desacoplado do billing — o trial passa a contar desde o cadastro.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(BILLING_USAGE_REPOSITORY) private readonly usage: BillingUsageRepository,
  ) {}

  /** Garante a assinatura do tenant (cria trial se ausente) e a devolve. */
  async ensureSubscription(): Promise<SubscriptionRecord> {
    const existing = await this.subscriptions.findForCurrentCompany();
    if (existing) return existing;

    const trialPlan = await this.plans.findByCode(TRIAL_PLAN_CODE);
    if (!trialPlan) {
      throw new Error(`Plano de trial "${TRIAL_PLAN_CODE}" ausente — rode o seed de planos.`);
    }
    const anchor = (await this.usage.companyCreatedAt()) ?? new Date();
    const trialDays = trialPlan.trialDays || TRIAL_DAYS;
    return this.subscriptions.createTrialIfAbsent({
      planId: trialPlan.id,
      trialStartedAt: anchor,
      trialEndsAt: new Date(anchor.getTime() + trialDays * DAY_MS),
    });
  }

  /** Direitos efetivos da empresa corrente (estado, limites e uso). */
  async getEntitlements(): Promise<Entitlements> {
    const sub = await this.ensureSubscription();
    const plan = await this.plans.findById(sub.planId);
    if (!plan) {
      throw new Error(`Plano ${sub.planId} da assinatura não encontrado.`);
    }
    const usage = await this.usage.countForCurrentCompany();
    return computeEntitlements(sub, plan, usage);
  }

  /** Bloqueia se o acesso pago estiver suspenso (trial expirado/inadimplência). */
  async assertNotBlocked(): Promise<void> {
    const e = await this.getEntitlements();
    if (e.isBlocked) throw new SubscriptionRequiredError();
  }

  /** Garante folga no limite do plano antes de criar um recurso contável. */
  async assertWithinLimit(metric: 'marketplace_accounts' | 'products'): Promise<void> {
    const e = await this.getEntitlements();
    if (e.isBlocked) throw new SubscriptionRequiredError();
    const map = {
      marketplace_accounts: { used: e.usage.marketplaceAccounts, limit: e.limits.maxMarketplaceAccounts, label: 'contas de marketplace' },
      products: { used: e.usage.products, limit: e.limits.maxProducts, label: 'produtos' },
    } as const;
    const { used, limit, label } = map[metric];
    if (limit !== null && used >= limit) {
      throw new PlanLimitExceededError(label, limit);
    }
  }

  /**
   * Estado de bloqueio de uma empresa por id explícito — para o PlanGuard, que roda
   * na fase de guards (antes do TenantInterceptor), estabelecendo o próprio escopo.
   */
  async isBlockedFor(companyId: string): Promise<boolean> {
    return runWithTenant({ companyId, userId: companyId, role: 'OWNER' }, async () => {
      const e = await this.getEntitlements();
      return e.isBlocked;
    });
  }
}
