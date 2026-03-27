import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always pass through these
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('favicon')
  ) {
    return NextResponse.next();
  }

  // Login page — pass through but log cookies so we can see what Supabase sets
  if (pathname.startsWith('/login')) {
    const all = request.cookies.getAll().map(c => c.name).join(', ');
    console.log('[middleware] /login cookies:', all || 'none');
    return NextResponse.next();
  }

  // Protected routes — log all cookies and check for session
  const all = request.cookies.getAll();
  const names = all.map(c => c.name).join(', ');
  console.log('[middleware] cookies on', pathname, ':', names || 'none');

  const hasSession = all.some(c =>
    c.name.includes('auth') || c.name.includes('supabase') || c.name.startsWith('sb-')
  );

  if (!hasSession) {
    console.log('[middleware] no session found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log('[middleware] session found, passing through');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
