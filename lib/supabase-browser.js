import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

/**
 * Returns a singleton browser Supabase client.
 * Uses @supabase/ssr's createBrowserClient which automatically writes
 * the session into an HTTP cookie instead of localStorage, so the
 * server/middleware can read and validate it on every request.
 *
 * The singleton is stored on `globalThis` to survive Next.js hot-reloads
 * in dev, and to avoid being accidentally shared between SSR requests.
 */
export function createBrowserClient() {
  if (typeof window === 'undefined') {
    // Called during SSR — return a fresh instance each time (never cached).
    // This should only happen if a Client Component is accidentally rendered
    // on the server; the instance won't be reused.
    return _createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
  }

  // Browser: use a window-scoped singleton so all components share one client.
  if (!window.__supabaseBrowserClient) {
    window.__supabaseBrowserClient = _createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return window.__supabaseBrowserClient;
}
