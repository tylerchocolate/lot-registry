import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../../lib/supabase-server';
import FarmerList from '../../components/FarmerList';

export const metadata = { title: 'Agricultores — Provnr Registro' };

export default async function FarmersPage() {
  const db = await createServerSupabaseClient();

  // Verify session
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  // Get user's org
  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role, organizations(id, code, name)')
    .eq('user_id', user.id)
    .single();

  if (!profile?.org_id) redirect('/lots');

  // Fetch all farmers for this org
  const { data: farmers, error } = await db
    .from('farmers')
    .select('id, full_name, farm_name, municipality, department, phone, altitude_masl, active, created_at, ica_number')
    .eq('org_id', profile.org_id)
    .order('full_name', { ascending: true });

  if (error) console.error('[Farmers] Fetch error:', error.message);

  return (
    <FarmerList
      farmers={farmers ?? []}
      orgId={profile.org_id}
      orgName={profile.organizations?.name ?? ''}
      orgCode={profile.organizations?.code ?? ''}
      role={profile.role}
    />
  );
}
