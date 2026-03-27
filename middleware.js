import { NextResponse } from 'next/server';

// Supabase v2 stores the session as JSON in a cookie named:
// sb-{project-ref}-auth-token
// where project-ref is the subdomain of your Supabase URL.
const PROJECT_REF  = 'nlcpgqutjscdmxzmkckb';
const COOKIE_NAME  = `sb-${PROJECT_REF}-auth-token`;

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow login page and Next.js internals
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check for the Supabase session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate the cookie contains a real session (not just any value)
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    // Supabase session has access_token and expires_at
    if (!session?.access_token) throw new Error('invalid');
    // Check not expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) throw new Error('expired');
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
