/** Sessão do admin de plataforma (Server Components). Cookie httpOnly separado. */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ADMIN_ACCESS_COOKIE } from './cookies';

export interface AdminSession {
  id: string;
  email: string;
}

export async function adminToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ADMIN_ACCESS_COOKIE)?.value ?? null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = await adminToken();
  if (!token) return null;
  try {
    const res = await apiFetch('/admin/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string; email: string };
    return { id: data.id, email: data.email };
  } catch {
    return null;
  }
}

export interface SaasMetrics {
  mrrCents: number;
  arrCents: number;
  activeSubscriptions: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  totalSubscriptions: number;
  canceledLast30d: number;
  trialConversionRate: number;
  churnRate30d: number;
  byPlan: { planCode: string; planName: string; activeCount: number; mrrCents: number }[];
}

export async function getAdminMetrics(): Promise<SaasMetrics | null> {
  const token = await adminToken();
  if (!token) return null;
  try {
    const res = await apiFetch('/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as SaasMetrics;
  } catch {
    return null;
  }
}

export interface SubscriptionView {
  status: string;
  planCode: string | null;
  planName: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}
export interface CompanyListItem {
  id: string;
  name: string;
  taxId: string | null;
  createdAt: string;
  usersCount: number;
  subscription: SubscriptionView | null;
}
export interface CompanyListPage {
  items: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CompanyDetail {
  company: { id: string; name: string; taxId: string | null; taxRegime: string; createdAt: string };
  subscription: (SubscriptionView & { provider: string | null; createdAt: string }) | null;
  users: { id: string; name: string; email: string; role: string; status: string; emailVerified: boolean }[];
  invoices: {
    id: string; provider: string; amountCents: number; currency: string; status: string;
    paymentMethod: string | null; issuedAt: string; paidAt: string | null; hostedUrl: string | null;
  }[];
  marketplaceAccounts: {
    id: string; nickname: string | null; externalUserId: string; status: string; lastSyncedAt: string | null;
  }[];
}

export async function getCompanies(params: { page?: number; status?: string }): Promise<CompanyListPage | null> {
  const token = await adminToken();
  if (!token) return null;
  const qs = new URLSearchParams({ page: String(params.page ?? 1), pageSize: '20' });
  if (params.status) qs.set('status', params.status);
  try {
    const res = await apiFetch(`/admin/companies?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as CompanyListPage;
  } catch {
    return null;
  }
}

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const token = await adminToken();
  if (!token) return null;
  try {
    const res = await apiFetch(`/admin/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as CompanyDetail;
  } catch {
    return null;
  }
}

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  maxMarketplaceAccounts: number | null;
  maxProducts: number | null;
  historyWindowDays: number | null;
  stripePriceId: string | null;
  active: boolean;
  createdAt: string;
}

export async function getPlans(): Promise<AdminPlan[]> {
  const token = await adminToken();
  if (!token) return [];
  try {
    const res = await apiFetch('/admin/plans', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return (await res.json()) as AdminPlan[];
  } catch {
    return [];
  }
}

export async function getPlan(id: string): Promise<AdminPlan | null> {
  const token = await adminToken();
  if (!token) return null;
  try {
    const res = await apiFetch(`/admin/plans/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as AdminPlan;
  } catch {
    return null;
  }
}

export interface HealthSummary {
  marketplaceAccounts: {
    total: number;
    byStatus: Record<string, number>;
    problematic: { id: string; companyId: string; companyName: string; marketplace: string; nickname: string | null; status: string; lastSyncedAt: string | null }[];
  };
  jobs: {
    byStatus: Record<string, number>;
    recentFailures: { id: string; queue: string; jobName: string; status: string; attempts: number; error: string | null; createdAt: string }[];
  };
}

export async function getHealth(): Promise<HealthSummary | null> {
  const token = await adminToken();
  if (!token) return null;
  try {
    const res = await apiFetch('/admin/health', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as HealthSummary;
  } catch {
    return null;
  }
}

export interface AuditLogPage {
  items: { id: string; createdAt: string; action: string; method: string; path: string; statusCode: number; userId: string | null; companyId: string | null; ip: string | null }[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAudit(params: { page?: number; action?: string }): Promise<AuditLogPage | null> {
  const token = await adminToken();
  if (!token) return null;
  const qs = new URLSearchParams({ page: String(params.page ?? 1) });
  if (params.action) qs.set('action', params.action);
  try {
    const res = await apiFetch(`/admin/audit?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as AuditLogPage;
  } catch {
    return null;
  }
}
