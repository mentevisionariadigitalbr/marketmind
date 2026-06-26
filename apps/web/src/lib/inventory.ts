/**
 * Fetchers de estoque operacional (Fase 1) — Server Components. Encaminham o
 * access token (cookie httpOnly) para a API NestJS (/inventory/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface ReconciliationRow {
  productId: string;
  sku: string | null;
  title: string;
  mlAvailable: number;
  ledgerBalance: number;
  divergence: number;
}

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'INVENTARIO' | 'DEVOLUCAO';

export interface MovementRow {
  id: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  referenceType: string | null;
  occurredAt: string;
}

async function inventoryGet<T>(path: string): Promise<T | null> {
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

export function getReconciliation(): Promise<ReconciliationRow[] | null> {
  return inventoryGet<ReconciliationRow[]>('/inventory/reconciliation');
}

export function getMovements(productId: string): Promise<MovementRow[] | null> {
  return inventoryGet<MovementRow[]>(`/inventory/movements?productId=${encodeURIComponent(productId)}`);
}

export type ReorderRisk = 'critico' | 'atencao' | 'saudavel';

export interface ForecastRow {
  productId: string;
  sku: string | null;
  title: string;
  categoryId: string | null;
  available: number;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number;
  cmd: number;
  daysRemaining: number | null;
  ruptureDate: string | null;
  risk: ReorderRisk;
  idealStock: number;
  purchaseNeed: number;
  lastSale: string | null;
}

export function getForecast(params: { horizon?: number; risk?: ReorderRisk; onlyNeeded?: boolean } = {}): Promise<ForecastRow[] | null> {
  const sp = new URLSearchParams();
  if (params.horizon) sp.set('horizon', String(params.horizon));
  if (params.risk) sp.set('risk', params.risk);
  if (params.onlyNeeded) sp.set('onlyNeeded', 'true');
  const qs = sp.toString();
  return inventoryGet<ForecastRow[]>(`/inventory/forecast${qs ? `?${qs}` : ''}`);
}
