'use server';

/** Server Actions de planos (backoffice). Usam o token de admin (cookie separado). */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { adminToken } from './admin';

/** '' → null (ilimitado); número caso contrário. */
function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : Number(s);
}

export async function createPlanAction(formData: FormData): Promise<void> {
  const token = await adminToken();
  if (!token) redirect('/admin/login');
  const body = {
    code: String(formData.get('code') ?? ''),
    name: String(formData.get('name') ?? ''),
    priceCents: Number(formData.get('priceCents') ?? 0),
    interval: String(formData.get('interval') ?? 'month'),
    trialDays: Number(formData.get('trialDays') ?? 14),
    maxMarketplaceAccounts: intOrNull(formData.get('maxMarketplaceAccounts')),
    maxProducts: intOrNull(formData.get('maxProducts')),
    historyWindowDays: intOrNull(formData.get('historyWindowDays')),
    stripePriceId: String(formData.get('stripePriceId') ?? '') || undefined,
  };
  let ok = false;
  try {
    const res = await apiFetch('/admin/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  revalidatePath('/admin/plans');
  redirect(ok ? '/admin/plans?created=1' : '/admin/plans?error=1');
}

export async function updatePlanAction(formData: FormData): Promise<void> {
  const token = await adminToken();
  if (!token) redirect('/admin/login');
  const id = String(formData.get('id') ?? '');
  const body = {
    name: String(formData.get('name') ?? ''),
    priceCents: Number(formData.get('priceCents') ?? 0),
    interval: String(formData.get('interval') ?? 'month'),
    trialDays: Number(formData.get('trialDays') ?? 14),
    maxMarketplaceAccounts: intOrNull(formData.get('maxMarketplaceAccounts')),
    maxProducts: intOrNull(formData.get('maxProducts')),
    historyWindowDays: intOrNull(formData.get('historyWindowDays')),
  };
  await apiFetch(`/admin/plans/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  revalidatePath('/admin/plans');
  redirect('/admin/plans?saved=1');
}

/** Ativa/desativa um plano (sem hard-delete por causa das FKs de assinatura). */
export async function togglePlanAction(formData: FormData): Promise<void> {
  const token = await adminToken();
  if (!token) redirect('/admin/login');
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  await apiFetch(`/admin/plans/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ active }),
  });
  revalidatePath('/admin/plans');
}
