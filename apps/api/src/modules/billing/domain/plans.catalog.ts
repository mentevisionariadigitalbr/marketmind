/**
 * Catálogo de planos vendáveis (fonte única usada pelo seed e pelos testes).
 * Limite `null` = ilimitado. O trial concede as permissões do plano PRO.
 */

export const PLAN_CODES = {
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

/** Plano concedido durante o período de trial (sem cartão). */
export const TRIAL_PLAN_CODE: PlanCode = PLAN_CODES.PRO;
export const TRIAL_DAYS = 14;

export interface PlanLimits {
  maxMarketplaceAccounts: number | null;
  maxProducts: number | null;
  historyWindowDays: number | null;
}

export interface PlanDef {
  code: PlanCode;
  name: string;
  priceCents: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number;
  limits: PlanLimits;
}

export const PLAN_CATALOG: PlanDef[] = [
  {
    code: PLAN_CODES.PRO,
    name: 'Pro',
    priceCents: 9900,
    currency: 'BRL',
    interval: 'month',
    trialDays: TRIAL_DAYS,
    limits: { maxMarketplaceAccounts: 3, maxProducts: 5000, historyWindowDays: 365 },
  },
  {
    code: PLAN_CODES.BUSINESS,
    name: 'Business',
    priceCents: 29900,
    currency: 'BRL',
    interval: 'month',
    trialDays: TRIAL_DAYS,
    limits: { maxMarketplaceAccounts: 10, maxProducts: null, historyWindowDays: 730 },
  },
];

/** Limites de uma empresa bloqueada (trial expirado / inadimplente): tudo barrado. */
export const BLOCKED_LIMITS: PlanLimits = {
  maxMarketplaceAccounts: 0,
  maxProducts: 0,
  historyWindowDays: 0,
};
