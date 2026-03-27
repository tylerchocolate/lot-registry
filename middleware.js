import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url  = 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const anon = 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login page through
  if (pathname.startsWith('/login')) return NextResponse.next();

  // Check for the Supabase auth token in cookies
  const token = request.cookies.get('sb-access-token')?.value
    ?? request.cookies.get(`sb-${url.split('//')[1].split('.')[0]}-auth-token`)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token is still valid
  try {
    const db = createClient(url, anon);
    const { error } = await db.auth.getUser(token);
    if (error) throw error;
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
