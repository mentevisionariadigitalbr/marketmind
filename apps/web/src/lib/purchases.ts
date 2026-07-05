/**
 * Fetchers de compras (Fase 1) — Server Components. Encaminham o access token
 * (cookie httpOnly) para a API NestJS (/purchases/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderListItem {
  id: string;
  supplierName: string | null;
  status: PurchaseOrderStatus;
  itemsCount: number;
  total: number;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

async function purchasesGet<T>(path: string): Promise<T | null> {
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

export function getPurchaseOrders(): Promise<PurchaseOrderListItem[] | null> {
  return purchasesGet<PurchaseOrderListItem[]>('/purchases');
}
