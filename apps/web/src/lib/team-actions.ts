'use server';

/** Server Actions de equipe (convidar, atribuir papel) + aceite público de convite. */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  const body = {
    email: String(formData.get('email') ?? ''),
    name: String(formData.get('name') ?? ''),
    role: String(formData.get('role') ?? 'MEMBER'),
  };
  let inviteUrl = '';
  try {
    const res = await apiFetch('/iam/invites', { method: 'POST', headers: { Authorization: `Bearer ${access}` }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = (await res.json()) as { inviteUrl?: string };
      inviteUrl = data.inviteUrl ?? '';
    }
  } catch {
    inviteUrl = '';
  }
  revalidatePath('/dashboard/settings/team');
  redirect(inviteUrl ? `/dashboard/settings/team?invite=${encodeURIComponent(inviteUrl)}` : '/dashboard/settings/team?error=1');
}

export async function assignRoleAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) redirect('/login');
  const id = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');
  if (id) {
    await apiFetch(`/iam/users/${id}/role`, { method: 'PUT', headers: { Authorization: `Bearer ${access}` }, body: JSON.stringify({ role }) });
  }
  revalidatePath('/dashboard/settings/team');
}

/** Aceite de convite — PÚBLICO (sem token de sessão). */
export async function acceptInviteAction(formData: FormData): Promise<void> {
  const inviteToken = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  let ok = false;
  try {
    const res = await apiFetch('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token: inviteToken, password }),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }
  redirect(ok ? '/login?invited=1' : `/accept-invite?token=${encodeURIComponent(inviteToken)}&error=1`);
}
