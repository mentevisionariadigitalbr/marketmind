/**
 * Fetcher de integrações — Server Components. Encaminha o access token (cookie
 * httpOnly) para a API NestJS. Reutiliza os endpoints existentes em integration.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export type AccountStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

export interface MarketplaceAccount {
  id: string;
  marketplace: string;
  nickname: string | null;
  externalUserId: string;
  status: AccountStatus;
  tokenExpiresAt: string;
  lastSyncedAt: string | null;
}

export async function getMarketplaceAccounts(): Promise<MarketplaceAccount[] | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch('/integrations/mercado-livre/accounts', {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as MarketplaceAccount[];
  } catch {
    return null;
  }
}
