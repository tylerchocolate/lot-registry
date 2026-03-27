import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const URL  = 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const ANON = 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Pass through login page and API routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll:  ()           => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if expired — required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
