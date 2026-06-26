import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, readError } from '@/lib/api';
import { ADMIN_ACCESS_COOKIE } from '@/lib/cookies';

const isProd = process.env.NODE_ENV === 'production';

/** Login do admin de plataforma: grava o token num cookie httpOnly separado. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as { email?: string; password?: string };
  const res = await apiFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify(body) });

  if (!res.ok) {
    return NextResponse.json({ error: await readError(res) }, { status: res.status });
  }

  const data = (await res.json()) as { accessToken: string };
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1h (alinhado ao TTL do token de admin)
  });
  return response;
}
