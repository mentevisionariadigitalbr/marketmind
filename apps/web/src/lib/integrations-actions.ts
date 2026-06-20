'use server';

/**
 * Server Actions de integração. Reutilizam os endpoints OAuth/sync existentes.
 * "Conectar" busca a URL de consentimento e redireciona o navegador ao ML.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function connectMlAction(): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  let url: string | null = null;
  try {
    const res = await apiFetch('/integrations/mercado-livre/authorize', {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (res.ok) {
      const body = (await res.json()) as { url?: string };
      url = body.url ?? null;
    }
  } catch {
    url = null;
  }
  // redirect() lança NEXT_REDIRECT — fora do try/catch.
  redirect(url ?? '/dashboard/settings/integrations?error=authorize');
}

export async function syncOrdersAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const accountId = String(formData.get('accountId') ?? '');
  if (!accountId) return;
  await apiFetch('/integrations/mercado-livre/sync/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({ accountId }),
  });
  revalidatePath('/dashboard/settings/integrations');
  revalidatePath('/dashboard');
}
