/**
 * Fetcher de canais (Fase 3) — Server Components. Encaminha o access token
 * (cookie httpOnly) para a API NestJS (/channels/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface ChannelSummaryRow {
  marketplaceCode: string;
  nickname: string | null;
  revenue: number;
  orders: number;
  units: number;
}

export async function getChannelSummary(days = 30): Promise<ChannelSummaryRow[] | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch(`/channels/summary?days=${days}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as ChannelSummaryRow[];
  } catch {
    return null;
  }
}
