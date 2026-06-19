/**
 * Fetchers do Dashboard Executivo — Server Components apenas. Encaminham o access
 * token (cookie httpOnly) para a API NestJS. Nunca expõem token ao navegador.
 * Sem mocks: todos os dados vêm de /dashboard/* do backend real.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export type PeriodPreset = '7d' | '30d' | '90d' | '180d' | '365d' | 'today' | 'mtd' | 'ytd' | 'custom';

export interface KpiCard {
  key: string;
  label: string;
  unit: 'BRL' | 'count' | 'percent' | 'ratio' | 'days';
  value: number;
  availability: 'available' | 'needs-table' | 'needs-integration';
  trend?: { direction: 'up' | 'down' | 'flat'; changePct: number };
}
export interface Overview {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  kpis: KpiCard[];
}
export interface TimelinePoint {
  bucket: string;
  revenue: number;
  orders: number;
  unitsSold: number;
}
export interface Category {
  categoryId: string;
  name: string;
  revenue: number;
  sharePct: number;
}
export interface AbcEntry {
  key: string;
  revenue: number;
  sharePct: number;
  cumulativePct: number;
  abcClass: 'A' | 'B' | 'C';
}
export interface Abc {
  entries: AbcEntry[];
  counts: { A: number; B: number; C: number };
}
export interface Inventory {
  activeProducts: number;
  productsWithoutStock: number;
  valueAtPrice: number;
  valueAtCost: number | null;
  turnover: number;
  coverageDays: number;
}
export interface TopProduct {
  productId: string;
  sku: string | null;
  title: string;
  revenue: number;
  unitsSold: number;
  sharePct: number;
}
export interface ProductRow {
  productId: string;
  sku: string | null;
  title: string;
  thumbnail: string | null;
  categoryId: string | null;
  status: string;
  price: number;
  stock: number;
  revenue: number;
  unitsSold: number;
  profit: number | null;
  marginPct: number | null;
}
export interface ProductsPage {
  items: ProductRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Alert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  productId: string;
  sku: string | null;
  value: number;
}
export interface Alerts {
  generatedAt: string;
  alerts: Alert[];
  counts: { critical: number; warning: number; info: number };
}

async function dashboardGet<T>(path: string): Promise<T | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch(`/dashboard${path}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const getOverview = () => dashboardGet<Overview>('/overview');
export const getKpis = (preset: PeriodPreset) => dashboardGet<Overview>(`/kpis${qs({ preset })}`);
export const getTimeline = (preset: PeriodPreset) => dashboardGet<TimelinePoint[]>(`/timeline${qs({ preset })}`);
export const getCategories = (preset: PeriodPreset) => dashboardGet<Category[]>(`/categories${qs({ preset })}`);
export const getAbc = (preset: PeriodPreset) => dashboardGet<Abc>(`/abc${qs({ preset })}`);
export const getInventory = (preset: PeriodPreset) => dashboardGet<Inventory>(`/inventory${qs({ preset })}`);
export const getTopProducts = (preset: PeriodPreset, limit: number) =>
  dashboardGet<TopProduct[]>(`/top-products${qs({ preset, limit })}`);
export const getAlerts = (preset: PeriodPreset) => dashboardGet<Alerts>(`/alerts${qs({ preset })}`);
export const getProducts = (params: {
  preset: PeriodPreset;
  page?: number;
  pageSize?: number;
  sku?: string;
  title?: string;
  status?: string;
}) => dashboardGet<ProductsPage>(`/products${qs(params)}`);
