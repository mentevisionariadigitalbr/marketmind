import { NextResponse } from 'next/server';
import { ADMIN_ACCESS_COOKIE } from '@/lib/cookies';

/** Encerra a sessão de admin (remove o cookie separado). */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_ACCESS_COOKIE);
  return response;
}
