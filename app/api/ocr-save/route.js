import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

const ALLOWED_FIELDS = ['ocr_weight_kg', 'ocr_max_temp_celsius', 'ocr_moisture_percent'];

export async function POST(request) {
  const { lotId, field, value } = await request.json();

  if (!lotId || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 });
  }

  const db = await createServerSupabaseClient();
  const { error } = await db.from('lots').update({ [field]: value }).eq('id', lotId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
