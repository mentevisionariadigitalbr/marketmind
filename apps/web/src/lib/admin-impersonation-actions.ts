'use server';

/** Impersonação (somente leitura): admin "entra como cliente". */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';
import { adminToken } from './admin';

const isProd = process.env.NODE_ENV === 'production';

export async function impersonateAction(formData: FormData): Promise<void> {
  const token = await adminToken();
  if (!token) redirect('/admin/login');
  const companyId = String(formData.get('companyId') ?? '');

  let accessToken: string | null = null;
  try {
    const res = await apiFetch(`/admin/companies/${companyId}/impersonate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      accessToken = ((await res.json()) as { accessToken?: string }).accessToken ?? null;
    }
  } catch {
    accessToken = null;
  }

  if (!accessToken) redirect(`/admin/companies/${companyId}?error=impersonate`);

  // Define a sessão de CLIENTE (cookie separado do admin) com o token read-only.
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 60 * 15 });
  redirect('/dashboard');
}

/** Encerra a impersonação: limpa a sessão de cliente e volta ao backoffice. */
export async function exitImpersonationAction(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  redirect('/admin');
}
