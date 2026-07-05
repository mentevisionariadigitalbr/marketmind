/**
 * Fetchers de ROI (Fase 2) — Server Components. Encaminham o access token
 * (cookie httpOnly) para a API NestJS (/analytics/roi/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface ProductRoiRow {
  productId: string;
  sku: string | null;
  title: string;
  revenue: number;
  units: number;
  unitCost: number | null;
  cogs: number;
  profit: number;
  roi: number;
  hasCost: boolean;
  effectivePrice: number;
  prospectiveMargin: number;
}

export interface SupplierRoiRow {
  supplierId: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  purchased: number;
  roi: number;
  productsSold: number;
  lowProfitability: boolean;
}

async function roiGet<T>(path: string): Promise<T | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch(path, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getProductRoi(preset: string): Promise<ProductRoiRow[] | null> {
  return roiGet<ProductRoiRow[]>(`/analytics/roi/products?preset=${encodeURIComponent(preset)}`);
}

export function getSupplierRoi(preset: string): Promise<SupplierRoiRow[] | null> {
  return roiGet<SupplierRoiRow[]>(`/analytics/roi/suppliers?preset=${encodeURIComponent(preset)}`);
}
