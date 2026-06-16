import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, AuthResponse, readError } from '@/lib/api';
import { setSessionCookies } from '@/lib/session';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as { email?: string; password?: string };
  const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });

  if (!res.ok) {
    return NextResponse.json({ error: await readError(res) }, { status: res.status });
  }

  const data = (await res.json()) as AuthResponse;
  const response = NextResponse.json({ user: data.user });
  setSessionCookies(response, data.accessToken, data.refreshToken);
  return response;
}
