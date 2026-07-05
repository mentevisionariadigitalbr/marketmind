import { BLOCKED_LIMITS, PlanLimits } from './plans.catalog';
import { SubscriptionRecord, SubscriptionStatus } from './ports/subscription.repository';
import { PlanRecord } from './ports/plan.repository';
import { UsageCounts } from './ports/billing-usage.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Entitlements {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  /** Acesso às features pagas negado (trial expirado / inadimplente / cancelado). */
  isBlocked: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  usage: UsageCounts;
}

function planLimits(plan: PlanRecord): PlanLimits {
  return {
    maxMarketplaceAccounts: plan.maxMarketplaceAccounts,
    maxProducts: plan.maxProducts,
    historyWindowDays: plan.historyWindowDays,
  };
}

/**
 * Resolve os direitos efetivos da empresa a partir da assinatura + plano + uso.
 * Função pura (sem I/O) — fácil de testar. `now` injetável para os testes.
 */
export function computeEntitlements(
  sub: SubscriptionRecord,
  plan: PlanRecord,
  usage: UsageCounts,
  now: Date = new Date(),
): Entitlements {
  const trialActive =
    sub.status === 'TRIALING' && sub.trialEndsAt !== null && sub.trialEndsAt.getTime() > now.getTime();
  const trialExpired = sub.status === 'TRIALING' && !trialActive;

  // Bloqueado quando o trial venceu ou a assinatura não está saudável.
  const isBlocked =
    trialExpired || sub.status === 'PAST_DUE' || sub.status === 'CANCELED' || sub.status === 'INCOMPLETE';

  const trialDaysLeft =
    sub.status === 'TRIALING' && sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / DAY_MS))
      : null;

  return {
    planCode: sub.planCode,
    planName: plan.name,
    status: sub.status,
    isBlocked,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    trialDaysLeft,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    limits: isBlocked ? BLOCKED_LIMITS : planLimits(plan),
    usage,
  };
}
