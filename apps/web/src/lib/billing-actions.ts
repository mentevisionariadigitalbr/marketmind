'use server';

/** Server Actions de cobrança: iniciar checkout e abrir o portal do cliente. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

const BILLING = '/dashboard/settings/billing';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function checkoutAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  const planCode = String(formData.get('planCode') ?? '');
  let url: string | null = null;
  try {
    const res = await apiFetch('/billing/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ planCode }),
    });
    if (res.ok) {
      const body = (await res.json()) as { url?: string };
      url = body.url ?? null;
    }
  } catch {
    url = null;
  }
  // redirect() lança NEXT_REDIRECT — fora do try/catch.
  redirect(url ?? `${BILLING}?checkout=error`);
}

export async function portalAction(): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  let url: string | null = null;
  try {
    const res = await apiFetch('/billing/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
    });
    if (res.ok) {
      const body = (await res.json()) as { url?: string };
      url = body.url ?? null;
    }
  } catch {
    url = null;
  }
  redirect(url ?? `${BILLING}?portal=error`);
}
