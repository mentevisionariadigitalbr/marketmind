import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies } from '@/lib/session';

export async function POST(): Promise<NextResponse> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;

  // Best-effort: revoga a sessão no backend; limpa cookies de qualquer forma.
  if (access && refresh) {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}` },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch {
      /* ignora — o importante é limpar os cookies locais */
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
