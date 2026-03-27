import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

let _client;

/**
 * Returns a singleton browser Supabase client.
 * Uses @supabase/ssr's createBrowserClient which automatically writes
 * the session into an HTTP cookie instead of localStorage, so the
 * server/middleware can read and validate it on every request.
 */
export function createBrowserClient() {
  if (!_client) _client = _createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
  return _client;
}
