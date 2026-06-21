/**
 * Fetchers de cobrança — Server Components. Encaminham o access token (cookie
 * httpOnly) para a API NestJS (módulo billing).
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';

export interface PlanLimits {
  maxMarketplaceAccounts: number | null;
  maxProducts: number | null;
  historyWindowDays: number | null;
}

export interface Entitlements {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  isBlocked: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  usage: { marketplaceAccounts: number; products: number };
}

export interface PlanOption {
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  limits: PlanLimits;
}

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getBilling(): Promise<Entitlements | null> {
  const access = await token();
  if (!access) return null;
  try {
    const res = await apiFetch('/billing', { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as Entitlements;
  } catch {
    return null;
  }
}

export async function getPlans(): Promise<PlanOption[]> {
  const access = await token();
  if (!access) return [];
  try {
    const res = await apiFetch('/billing/plans', { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return [];
    return (await res.json()) as PlanOption[];
  } catch {
    return [];
  }
}
