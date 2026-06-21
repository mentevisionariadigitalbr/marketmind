'use server';

/** Server Action de exclusão de conta (LGPD). Anonimiza e encerra a sessão. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies';

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) redirect('/login');

  const confirmation = String(formData.get('confirmation') ?? '');
  let ok = false;
  try {
    const res = await apiFetch('/privacy/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ confirmation }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    redirect('/dashboard/settings?privacy=delete_error');
  }
  // Encerra a sessão localmente e leva à tela de despedida.
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  redirect('/login?deleted=1');
}
