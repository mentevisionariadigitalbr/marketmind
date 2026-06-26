import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from '@/lib/cookies';

const PROTECTED = ['/dashboard', '/onboarding'];
const AUTH_PAGES = ['/login', '/signup'];

/**
 * Proteção de rotas na borda. A área /admin usa um cookie SEPARADO (mm_admin_access):
 * uma sessão de cliente NÃO concede acesso ao admin (fronteira de segurança). A
 * validação forte dos tokens acontece no backend a cada chamada de API.
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── Área de admin (fronteira separada) ──
  if (pathname.startsWith('/admin')) {
    const hasAdmin = Boolean(req.cookies.get(ADMIN_ACCESS_COOKIE)?.value);
    const isAdminLogin = pathname === '/admin/login';
    if (!hasAdmin && !isAdminLogin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (hasAdmin && isAdminLogin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Área de cliente (tenant) ──
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
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login', '/signup', '/admin/:path*'],
};
