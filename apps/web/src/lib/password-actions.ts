'use server';

/** Server Actions PÚBLICAS de recuperação de senha (sem token de sessão). */
import { redirect } from 'next/navigation';
import { apiFetch } from './api';

/**
 * Solicita o e-mail de redefinição. A UI mostra SEMPRE a mesma confirmação,
 * exista ou não o cadastro (não revela enumeração de e-mails).
 */
export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  try {
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  } catch {
    // Silencioso de propósito: a resposta ao usuário é uniforme.
  }
  redirect('/forgot-password?sent=1');
}

/** Redefine a senha a partir do token recebido por e-mail (uso único). */
export async function resetPasswordAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  let ok = false;
  try {
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  redirect(ok ? '/login?reset=1' : `/reset-password?token=${encodeURIComponent(token)}&error=1`);
}
