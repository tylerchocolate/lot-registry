import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import FarmerDetail from '../../../components/FarmerDetail';

export const metadata = { title: 'Agricultor — Provnr Registro' };

export default async function FarmerPage({ params }) {
  const { id } = await params;
  const db = await createServerSupabaseClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role, organizations(id, code, name)')
    .eq('user_id', user.id)
    .single();

  if (!profile?.org_id) redirect('/lots');

  const { data: farmer, error } = await db
    .from('farmers')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error || !farmer) notFound();

  const { data: deliveries } = await db
    .from('farm_deliveries')
    .select('id, lot_id, delivered_at, wet_weight_kg, ocr_confidence, farm_name')
    .eq('farmer_id', id)
    .order('delivered_at', { ascending: false })
    .limit(20);

  return (
    <FarmerDetail
      farmer={farmer}
      deliveries={deliveries ?? []}
      role={profile.role}
      orgName={profile.organizations?.name ?? ''}
      orgCode={profile.organizations?.code ?? ''}
    />
  );
}
