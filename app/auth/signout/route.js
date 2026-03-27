import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

/**
 * POST /auth/signout
 *
 * Signs the user out server-side, which clears the session cookie.
 * This is the only reliable way to log out — calling signOut() in the
 * browser only clears localStorage and doesn't touch the server cookie.
 */
export async function POST(request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', request.url));
}
