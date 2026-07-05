/**
 * Fetcher de precificação (Fase 3) — Server Components. Encaminha o access token
 * (cookie httpOnly) para a API NestJS (/pricing/products). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface PricingRow {
  productId: string;
  sku: string | null;
  title: string;
  unitCost: number;
  currentPrice: number | null;
  effectivePrice: number;
  realizedMargin: number;
  breakEven: number | null;
  suggested: number | null;
  belowBreakEven: boolean;
}

export interface PricingResult {
  params: { targetMargin: number; commissionRate: number; taxRate: number; freight: number };
  products: PricingRow[];
}

export async function getPricing(params: {
  targetMargin?: number;
  commissionRate?: number;
  taxRate?: number;
  freight?: number;
}): Promise<PricingResult | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && Number.isFinite(v)) sp.set(k, String(v));
  try {
    const res = await apiFetch(`/pricing/products?${sp.toString()}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as PricingResult;
  } catch {
    return null;
  }
}
