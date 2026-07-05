/**
 * Fetcher de relatórios por e-mail (Fase 3) — Server Components. Encaminha o
 * access token (cookie httpOnly) para a API NestJS (/reports/*). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface ReportSubscription {
  frequency: 'DAILY' | 'WEEKLY';
  recipients: string;
  enabled: boolean;
  lastSentAt: string | null;
}

export async function getSubscription(): Promise<ReportSubscription | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch('/reports/subscription', { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as ReportSubscription | null;
  } catch {
    return null;
  }
}
