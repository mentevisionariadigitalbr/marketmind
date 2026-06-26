/**
 * Métricas de negócio (SaaS) — cálculo PURO sobre as assinaturas e planos de TODAS
 * as empresas (o admin lê cross-tenant). Definições (documentadas para "bater com os
 * dados de assinatura"):
 *  - MRR: soma do preço mensal-normalizado dos planos das assinaturas ACTIVE.
 *  - Clientes ativos: assinaturas com status ACTIVE.
 *  - Em trial: status TRIALING com trial ainda vigente.
 *  - Conversão de trial: ACTIVE / (assinaturas cujo trial já terminou).
 *  - Churn 30d: cancelados nos últimos 30 dias / (ativos agora + cancelados em 30d).
 */

export type SubStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';

export interface SubscriptionRow {
  status: SubStatus;
  planId: string;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
}

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  interval: string; // 'month' | 'year'
}

export interface PlanBreakdown {
  planCode: string;
  planName: string;
  activeCount: number;
  mrrCents: number;
}

export interface SaasMetrics {
  mrrCents: number;
  arrCents: number;
  activeSubscriptions: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  totalSubscriptions: number;
  canceledLast30d: number;
  /** 0..1 */
  trialConversionRate: number;
  /** 0..1 */
  churnRate30d: number;
  byPlan: PlanBreakdown[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Preço mensal-normalizado (planos anuais entram como 1/12). */
function monthlyCents(plan: PlanRow): number {
  return plan.interval === 'year' ? Math.round(plan.priceCents / 12) : plan.priceCents;
}

export function computeSaasMetrics(
  subscriptions: SubscriptionRow[],
  plans: PlanRow[],
  now: Date = new Date(),
): SaasMetrics {
  const planById = new Map(plans.map((p) => [p.id, p] as const));
  const cutoff = now.getTime() - 30 * DAY_MS;

  let mrrCents = 0;
  let activeSubscriptions = 0;
  let trialing = 0;
  let pastDue = 0;
  let canceled = 0;
  let canceledLast30d = 0;
  let trialEnded = 0;

  const breakdown = new Map<string, PlanBreakdown>();

  for (const sub of subscriptions) {
    const plan = planById.get(sub.planId);
    const trialIsOver =
      sub.status !== 'TRIALING' || (sub.trialEndsAt !== null && sub.trialEndsAt.getTime() <= now.getTime());
    if (trialIsOver) trialEnded += 1;

    switch (sub.status) {
      case 'ACTIVE': {
        activeSubscriptions += 1;
        if (plan) {
          const m = monthlyCents(plan);
          mrrCents += m;
          const b = breakdown.get(plan.code) ?? { planCode: plan.code, planName: plan.name, activeCount: 0, mrrCents: 0 };
          b.activeCount += 1;
          b.mrrCents += m;
          breakdown.set(plan.code, b);
        }
        break;
      }
      case 'TRIALING':
        if (!trialIsOver) trialing += 1;
        break;
      case 'PAST_DUE':
        pastDue += 1;
        break;
      case 'CANCELED':
        canceled += 1;
        break;
      default:
        break;
    }

    if (sub.canceledAt !== null && sub.canceledAt.getTime() >= cutoff) {
      canceledLast30d += 1;
    }
  }

  const trialConversionRate = trialEnded > 0 ? activeSubscriptions / trialEnded : 0;
  const churnDenom = activeSubscriptions + canceledLast30d;
  const churnRate30d = churnDenom > 0 ? canceledLast30d / churnDenom : 0;

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    activeSubscriptions,
    trialing,
    pastDue,
    canceled,
    totalSubscriptions: subscriptions.length,
    canceledLast30d,
    trialConversionRate,
    churnRate30d,
    byPlan: [...breakdown.values()].sort((a, b) => b.mrrCents - a.mrrCents),
  };
}
