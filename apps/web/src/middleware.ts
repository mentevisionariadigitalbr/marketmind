import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/cookies';

const PROTECTED = ['/dashboard', '/onboarding'];
const AUTH_PAGES = ['/login', '/signup'];

/**
 * Proteção de rotas na borda: sem sessão, rotas privadas redirecionam para
 * /login; com sessão, as telas de auth redirecionam para /dashboard. A validação
 * forte do token acontece no backend a cada chamada de API.
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(ACCESS_COOKIE)?.value);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/signup'],
};
