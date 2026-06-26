/**
 * Fetchers de fornecedores (Fase 1) — Server Components. Encaminham o access
 * token (cookie httpOnly) para a API NestJS (/suppliers/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  leadTimeDays: number | null;
  paymentTermDays: number | null;
  notes: string | null;
  active: boolean;
}

export interface ProductSupplier {
  productId: string;
  sku: string | null;
  title: string;
  supplierId: string | null;
  supplierName: string | null;
}

async function suppliersGet<T>(path: string): Promise<T | null> {
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

export function getSuppliers(): Promise<Supplier[] | null> {
  return suppliersGet<Supplier[]>('/suppliers');
}

export function getProductSuppliers(): Promise<ProductSupplier[] | null> {
  return suppliersGet<ProductSupplier[]>('/suppliers/products');
}

export interface SupplierReportProduct {
  productId: string;
  sku: string | null;
  title: string;
  available: number;
  unitsSold: number;
  revenue: number;
  unitCost: number | null;
  cogs: number;
  profit: number;
  marginPct: number;
  hasCost: boolean;
  stockValueAtCost: number;
}

export interface SupplierReport {
  supplier: { id: string; name: string; leadTimeDays: number | null };
  totals: {
    revenue: number;
    cogs: number;
    profit: number;
    purchased: number;
    roi: number;
    unitsSold: number;
    productsCount: number;
    stockUnits: number;
    stockValueAtCost: number;
  };
  products: SupplierReportProduct[];
}

export function getSupplierReport(id: string, preset: string): Promise<SupplierReport | null> {
  return suppliersGet<SupplierReport>(`/suppliers/${id}/report?preset=${encodeURIComponent(preset)}`);
}
