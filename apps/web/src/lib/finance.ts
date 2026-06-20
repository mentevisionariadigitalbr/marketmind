/**
 * Fetchers de custos (Fase 1) — Server Components. Encaminham o access token
 * (cookie httpOnly) para a API NestJS (/costs/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface CostProduct {
  productId: string;
  sku: string | null;
  title: string;
  status: string;
  price: number;
  currentUnitCost: number | null;
  hasCost: boolean;
}
export interface CostProductsPage {
  items: CostProduct[];
  total: number;
}

export async function getCostProducts(params: {
  page?: number;
  pageSize?: number;
  sku?: string;
  onlyMissing?: boolean;
}): Promise<CostProductsPage | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  try {
    const res = await apiFetch(`/costs/products?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as CostProductsPage;
  } catch {
    return null;
  }
}
