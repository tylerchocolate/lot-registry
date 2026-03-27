import { createServerSupabaseClient } from './supabase-server';

/**
 * All functions here run on the server and use the authenticated server client,
 * so they respect the logged-in user's RLS policies automatically.
 */

export async function getLots() {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from('lots').select(`
    id, status, farm_name, municipality, department,
    net_weight, bag_count, harvest_date, buyer, dispatch_date,
    created_at, phyto_cert_number, phyto_cert_verified, phyto_cert_uploaded_at
  `).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getLot(id) {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from('lots').select(`
    id, org_id, status, farm_name, municipality, department, altitude,
    producer, net_weight, gross_weight, bag_count, harvest_date,
    ferment_start_at, ferment_end_at, ferment_days, turns, fermentor_type, ferment_notes,
    dry_start_at, dry_end_at, dry_days, final_moisture, dry_method, dry_notes,
    buyer, dispatch_date, transport_ref, observations, farm_ica, qr_url,
    phyto_cert_number, phyto_cert_storage_path, phyto_cert_extracted_data,
    phyto_cert_uploaded_at, phyto_cert_verified, phyto_cert_verified_at,
    ocr_weight_kg, ocr_weight_readings, ocr_weight_confidence,
    ocr_max_temp_celsius, ocr_temp_readings, ocr_temp_confidence,
    ocr_moisture_percent, ocr_moisture_readings, ocr_moisture_confidence,
    ocr_extracted_at
  `).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getExportDocs(lotId) {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from('lot_export_docs').select('*')
    .eq('lot_id', lotId).order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSignedUrl(storagePath, ttl = 3600) {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.storage
    .from('lot-documents').createSignedUrl(storagePath, ttl);
  if (error) return null;
  return data.signedUrl;
}
