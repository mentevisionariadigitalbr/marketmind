'use server';

/** Server Actions de configurações (empresa, perfil, senha). Reusam a API. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function updateCompanyAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  const body = {
    name: String(formData.get('name') ?? ''),
    taxId: String(formData.get('taxId') ?? ''),
    taxRegime: String(formData.get('taxRegime') ?? ''),
  };
  let ok = false;
  try {
    const res = await apiFetch('/company', { method: 'PATCH', headers: { Authorization: `Bearer ${access}` }, body: JSON.stringify(body) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/finance/dre');
  revalidatePath('/dashboard');
  redirect(`/dashboard/settings?saved=${ok ? 'company' : 'error'}`);
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  let ok = false;
  try {
    const res = await apiFetch('/auth/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ name: String(formData.get('name') ?? '') }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  revalidatePath('/dashboard/settings');
  redirect(`/dashboard/settings?saved=${ok ? 'profile' : 'error'}`);
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  let ok = false;
  try {
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({
        currentPassword: String(formData.get('currentPassword') ?? ''),
        newPassword: String(formData.get('newPassword') ?? ''),
      }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  redirect(`/dashboard/settings?pwd=${ok ? 'ok' : 'error'}`);
}
