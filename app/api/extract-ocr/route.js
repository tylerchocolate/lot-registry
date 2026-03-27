import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

const STORAGE_BASE = 'https://nlcpgqutjscdmxzmkckb.supabase.co/storage/v1/object/public/photos';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SCALE_SYSTEM = 'You are a precise OCR system reading digital scale displays in cacao reception photos. For each photo read the weight shown on the scale screen. Return ONLY valid JSON, no preamble, no markdown: {"readings":[{"photo_index":0,"weight_kg":47.3,"unit":"kg","confidence":"high"}],"total_kg":47.3}. If lbs convert to kg. If unreadable set weight_kg null and confidence "unreadable". confidence: "high","medium","unreadable".';
const FERMENT_SYSTEM = 'You are a precise OCR/vision system reading thermometers in cacao fermentation photos. Return ONLY valid JSON: {"readings":[{"photo_index":0,"temp_celsius":48.5,"temp_type":"current","scale":"C","confidence":"high"}],"max_temp_celsius":48.5}. If F convert C=(F-32)*5/9. temp_type: "current","max","peak". confidence: "high","medium","unreadable".';
const MOISTURE_SYSTEM = 'You are a precise OCR system reading moisture meter displays in cacao drying photos. Return ONLY valid JSON: {"readings":[{"photo_index":0,"moisture_percent":7.2,"confidence":"high"}],"average_moisture_percent":7.2}. If unreadable set moisture_percent null and confidence "unreadable". confidence: "high","medium","unreadable".';

const PROMPTS = {
  scale:    { prefix: 'receiving_1', system: SCALE_SYSTEM,    user: 'Read the weight on each scale photo and return individual readings and total.' },
  ferment:  { prefix: 'ferment_',    system: FERMENT_SYSTEM,  user: 'Read the temperature from each photo and identify the maximum temperature recorded.' },
  moisture: { prefix: 'drying_',     system: MOISTURE_SYSTEM, user: 'Read the moisture percentage from each photo.' },
};

function rollupConfidence(readings) {
  if (!readings || !readings.length) return 'unreadable';
  const vals = readings.map(r => r.confidence);
  if (vals.every(v => v === 'high')) return 'high';
  if (vals.some(v => v === 'unreadable')) return 'unreadable';
  return 'medium';
}

function tsFromFilename(name) {
  const m = name.match(/(\d{13})/);
  return m ? new Date(parseInt(m[1])).toISOString() : null;
}

async function runClaudeOcr(apiKey, system, user, photoUrls) {
  const blocks = photoUrls.flatMap((url, i) => [
    { type: 'text', text: 'Photo ' + (i+1) + ':' },
    { type: 'image', source: { type: 'url', url } },
  ]);
  const resp = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system, messages: [{ role: 'user', content: [...blocks, { type: 'text', text: user }] }] }),
  });
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error?.message || 'Claude error ' + resp.status); }
  const data = await resp.json();
  const raw = (data.content.find(b => b.type === 'text')?.text || '').replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { lotId } = body;
  if (!lotId) return NextResponse.json({ error: 'lotId required' }, { status: 400 });

  const db = await createServerSupabaseClient();
  const { data: { user }, error: ue } = await db.auth.getUser();
  if (ue || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: lot, error: le } = await db.from('lots').select('id').eq('id', lotId).single();
  if (le || !lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  const parentPath = user.id + '/association';
  const updates = { ocr_extracted_at: new Date().toISOString() };
  const results = {};
  const fileMap = {};

  const { data: folders } = await db.storage.from('photos').list(parentPath, { limit: 50 });
  if (folders) {
    for (const folder of folders) {
      const { data: files } = await db.storage.from('photos').list(parentPath + '/' + folder.name, { sortBy: { column: 'created_at', order: 'asc' } });
      if (!files) continue;
      const prefix = ['receiving_1','ferment_','drying_','quality_check_','qr_scan_'].find(p => folder.name.startsWith(p));
      if (!prefix) continue;
      if (!fileMap[prefix]) fileMap[prefix] = [];
      files.filter(f => /\.(jpg|jpeg|png)$/i.test(f.name)).forEach(f => {
        fileMap[prefix].push({ name: f.name, url: STORAGE_BASE+'/'+parentPath+'/'+folder.name+'/'+f.name, ts: tsFromFilename(f.name) });
      });
    }
  }

  const ferFiles = fileMap['ferment_'] || [];
  if (ferFiles.length) {
    const s = ferFiles.filter(f => f.ts).sort((a,b) => a.ts.localeCompare(b.ts));
    if (s.length) {
      updates.ferment_start_at = s[0].ts;
      updates.ferment_end_at = s[s.length-1].ts;
      const recFiles = (fileMap['receiving_1'] || []).filter(f => f.ts).sort((a,b) => a.ts.localeCompare(b.ts));
      if (recFiles.length) {
        const days = Math.round((new Date(updates.ferment_end_at) - new Date(recFiles[0].ts)) / 86400000);
        if (days > 0 && days < 15) updates.ferment_days = days;
      }
    }
  }

  const dryFiles = fileMap['drying_'] || [];
  if (dryFiles.length) {
    const s = dryFiles.filter(f => f.ts).sort((a,b) => a.ts.localeCompare(b.ts));
    if (s.length) {
      updates.dry_start_at = s[0].ts;
      updates.dry_end_at = s[s.length-1].ts;
      if (updates.ferment_end_at) {
        const days = Math.round((new Date(updates.dry_end_at) - new Date(updates.ferment_end_at)) / 86400000);
        if (days > 0 && days < 30) updates.dry_days = days;
      }
    }
  }

  for (const [key, prompt] of Object.entries(PROMPTS)) {
    try {
      const stepFiles = fileMap[prompt.prefix] || [];
      if (!stepFiles.length) { results[key] = { error: 'no_photos' }; continue; }
      const parsed = await runClaudeOcr(apiKey, prompt.system, prompt.user, stepFiles.map(f => f.url));
      results[key] = parsed;
      if (key === 'scale') {
        updates.ocr_weight_kg = parsed.total_kg ?? null;
        updates.ocr_weight_readings = parsed.readings ?? null;
        updates.ocr_weight_confidence = rollupConfidence(parsed.readings);
        if (['high','medium'].includes(updates.ocr_weight_confidence)) updates.net_weight = parsed.total_kg ?? null;
      } else if (key === 'ferment') {
        updates.ocr_max_temp_celsius = parsed.max_temp_celsius ?? null;
        updates.ocr_temp_readings = parsed.readings ?? null;
        updates.ocr_temp_confidence = rollupConfidence(parsed.readings);
      } else if (key === 'moisture') {
        updates.ocr_moisture_percent = parsed.average_moisture_percent ?? null;
        updates.ocr_moisture_readings = parsed.readings ?? null;
        updates.ocr_moisture_confidence = rollupConfidence(parsed.readings);
        if (['high','medium'].includes(updates.ocr_moisture_confidence)) updates.final_moisture = parsed.average_moisture_percent ?? null;
      }
    } catch (err) { results[key] = { error: String(err) }; }
  }

  const { error: ue2 } = await db.from('lots').update(updates).eq('id', lotId);
  if (ue2) return NextResponse.json({ error: 'db_update_failed', detail: ue2.message }, { status: 500 });
  return NextResponse.json({ ok: true, lotId, updates_applied: Object.keys(updates), results });
}
