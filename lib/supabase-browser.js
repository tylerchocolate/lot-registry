import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_L5_2020M69veWtQRhNwe3g_cOlwmhk7';

let client;

export function createBrowserClient() {
  if (!client) client = createClient(URL, ANON);
  return client;
}
