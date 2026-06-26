/**
 * Fetchers de fluxo de caixa (Fase 3) — Server Components. Encaminham o access
 * token (cookie httpOnly) para a API NestJS (/cashflow/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface CashflowBucket {
  weekStart: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

export interface CashflowProjection {
  weeks: CashflowBucket[];
  totals: { inflow: number; outflow: number; net: number; endingBalance: number; overdueAmount: number };
}

export interface PayableRow {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  description: string | null;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID';
  paidAt: string | null;
  sourceType: string;
}

export interface ReceivableRow {
  orderId: string;
  externalId: string;
  date: string;
  gross: number;
  commission: number;
  freight: number;
  net: number;
}

async function cashflowGet<T>(path: string): Promise<T | null> {
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

export const getCashflowProjection = () => cashflowGet<CashflowProjection>('/cashflow/projection');
export const getPayables = () => cashflowGet<PayableRow[]>('/cashflow/payables');
export const getReceivables = () => cashflowGet<ReceivableRow[]>('/cashflow/receivables?limit=50');
