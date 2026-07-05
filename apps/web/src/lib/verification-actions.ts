'use server';

/** Server Actions de verificação de e-mail (uma pública, uma autenticada). */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

/** Reenvia o e-mail de verificação para o usuário autenticado. */
export async function resendVerificationAction(): Promise<{ ok: boolean }> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return { ok: false };
  try {
    const res = await apiFetch('/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** Confirma o e-mail a partir do token (público) e redireciona com o resultado. */
export async function verifyEmailAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  let ok = false;
  try {
    const res = await apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  redirect(ok ? '/verify-email?status=ok' : '/verify-email?status=error');
}
