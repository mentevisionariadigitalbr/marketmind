import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { apiFetch, MeResponse } from './api';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies';

export { ACCESS_COOKIE, REFRESH_COOKIE };

const isProd = process.env.NODE_ENV === 'production';

/** Grava os tokens como cookies httpOnly (inacessíveis ao JS do navegador). */
export function setSessionCookies(res: NextResponse, accessToken: string, refreshToken: string): void {
  const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
  res.cookies.set(ACCESS_COOKIE, accessToken, { ...base, maxAge: 60 * 15 }); // 15 min
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 60 * 60 * 24 * 7 }); // 7 dias
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}

/** Busca o usuário/empresa autenticados (Server Component). Null se não logado. */
export async function getSession(): Promise<MeResponse | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;

  const res = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}
