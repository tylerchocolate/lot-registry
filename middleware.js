import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Let the auth callback and static assets through immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('favicon')
  ) {
    return NextResponse.next({ request });
  }

  // Build a mutable response that the Supabase client can write cookies onto.
  // This is critical — without it, token refreshes are silently dropped.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write cookies onto the request so subsequent middleware sees them
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild the response so cookies propagate to the browser
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the session via the Supabase Auth server.
  // Never use getSession() here — it only reads from the cookie and can be spoofed.
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except when they're already there)
  if (!user && !pathname.startsWith('/login')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login
  if (user && pathname.startsWith('/login')) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/lots';
    nextUrl.search = '';
    return NextResponse.redirect(nextUrl);
  }

  // Return supabaseResponse (not NextResponse.next()) so refreshed cookies
  // are forwarded to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
