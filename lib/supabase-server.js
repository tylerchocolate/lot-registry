import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads the user's session from the request cookies,
 * so the authenticated user's RLS policies are applied automatically.
 *
 * Must be called inside an async context (Server Component, route handler).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll is called from Server Components where cookies can't be
          // written. The middleware handles cookie refresh, so this is safe.
        }
      },
    },
  });
}
