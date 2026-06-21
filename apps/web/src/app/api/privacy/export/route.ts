import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { ACCESS_COOKIE } from '@/lib/cookies';

/** Baixa os dados pessoais do usuário (LGPD) como um arquivo JSON. */
export async function GET(): Promise<NextResponse> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }

  const res = await apiFetch('/privacy/export', { headers: { Authorization: `Bearer ${access}` } });
  if (!res.ok) {
    return NextResponse.json({ error: 'Não foi possível exportar os dados.' }, { status: res.status });
  }

  const data = await res.text();
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meus-dados-marketmind.json"',
    },
  });
}
