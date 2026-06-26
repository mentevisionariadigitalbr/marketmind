'use server';

/**
 * Server Actions de relatórios por e-mail (Fase 3). Lêem o cookie httpOnly e
 * chamam a API NestJS (/reports/*). Revalidam a tela de configuração.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function saveSubscriptionAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  await apiFetch('/reports/subscription', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      frequency: String(formData.get('frequency') ?? 'WEEKLY') === 'DAILY' ? 'DAILY' : 'WEEKLY',
      recipients: String(formData.get('recipients') ?? ''),
      enabled: formData.get('enabled') === 'on' || formData.get('enabled') === 'true',
    }),
  });
  revalidatePath('/dashboard/settings/reports');
}

export async function sendDigestNowAction(): Promise<void> {
  const access = await token();
  if (!access) return;
  await apiFetch('/reports/digest/send', { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
  revalidatePath('/dashboard/settings/reports');
}
