import { getLots } from '../../lib/supabase';
import LotsList from '../../components/LotsList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lots — Registro Provnr' };

export default async function LotsPage() {
  let lots = [];
  try { lots = await getLots(); } catch {}
  return <LotsList lots={lots} />;
}
