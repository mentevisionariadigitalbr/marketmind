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

async function financeGet<T>(path: string): Promise<T | null> {
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

export function getCostProducts(params: {
  page?: number;
  pageSize?: number;
  sku?: string;
  onlyMissing?: boolean;
}): Promise<CostProductsPage | null> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  return financeGet<CostProductsPage>(`/costs/products?${sp.toString()}`);
}

// ---- DRE ----
export interface Dre {
  periodFrom: string;
  periodTo: string;
  grossRevenue: number;
  deductions: { commission: number; freight: number; taxes: number; total: number };
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  costCoveragePct: number;
  effectiveTaxRatePct: number;
}
export const getDre = (preset: string) => financeGet<Dre>(`/finance/dre?preset=${preset}`);

// ---- Despesas ----
export interface ExpenseRow {
  id: string;
  category: string;
  kind: 'FIXED' | 'VARIABLE';
  amount: number;
  currency: string;
  recurrence: 'NONE' | 'MONTHLY' | 'YEARLY';
  startsOn: string;
  endsOn: string | null;
  note: string | null;
}
export interface ExpensesPage {
  items: ExpenseRow[];
  total: number;
}
export const getExpenses = (page = 1) => financeGet<ExpensesPage>(`/finance/expenses?page=${page}&pageSize=50`);

// ---- Alíquotas de imposto ----
export interface TaxRuleRow {
  id: string;
  regime: string;
  category: string | null;
  rate: number;
  note: string | null;
}
export const getTaxRules = () => financeGet<TaxRuleRow[]>(`/finance/tax-rules`);
