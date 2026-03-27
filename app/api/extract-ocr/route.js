import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

const STORAGE_BASE = 'https://nlcpgqutjscdmxzmkckb.supabase.co/storage/v1/object/public/photos';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const PROMPTS = {
    scale: {
          prefix: 'receiving_1',
          system: `You are a precise OCR system reading digital scale displays in cacao reception photos.
      For each photo read the weight shown on the scale screen.
      Return ONLY valid JSON, no preamble, no markdown fences:
      {"readings":[{"photo_index":0,"weight_kg":47.3,"unit":"kg","confidence":"high"}],"total_kg":47.3,"notes":"optional"}
      If the display shows lbs convert to kg (1 lb = 0.453592 kg) and note it.
      If a display is unreadable set weight_kg to null and confidence to "unreadable".
      confidence must be "high", "medium", or "unreadable".`,
          user: 'Read the weight on each scale photo and return the individual readings and total.',
        },
    ferment: {
          prefix: 'ferment_',
          system: `You are a precise OCR/vision system reading thermometers in cacao fermentation photos.
      For each photo identify the temperature from an analog dial, digital display, or max-hold thermometer.
      Return ONLY valid JSON, no preamble, no markdown fences:
      {"readings":[{"photo_index":0,"temp_celsius":48.5,"temp_type":"current","scale":"C","confidence":"high"}],"max_temp_celsius":48.5,"notes":"optional"}
      If Fahrenheit convert: C = (F - 32) * 5/9. Identify any max-hold needle separately.
      temp_type must be "current", "max", or "peak".
      confidence must be "high", "medium", or "unreadable".`,
          user: 'Read the temperature from each photo and identify the maximum temperature recorded.',
        },
    moisture: {
          prefix: 'drying_',
          system: `You are a precise OCR system reading moisture meter displays in cacao drying photos.
      For each photo read the moisture percentage shown on the device screen.
      Return ONLY valid JSON, no preamble, no markdown fences:
      {"readings":[{"photo_index":0,"moisture_percent":7.2,"confidence":"high"}],"average_moisture_percent":7.2,"notes":"optional"}
      If a screen is unreadable set moisture_percent to null and confidence to "unreadable".
      confidence must be "high", "medium", or "unreadable".`,
          user: 'Read the moisture percentage from each photo.',
        },
  };

function rollupConfidence(readings) {
    if (!readings || readings.length === 0) return 'unreadable';
    const vals = readings.map((r) => r.confidence);
    if (vals.every((v) => v === 'high')) return 'high';
    if (vals.some((v) => v === 'unreadable')) return 'unreadable';
    return 'medium';
  }

async function getPhotoUrls(db, userId, prefix) {
    const storagePath = `${userId}/association/${prefix}`;
    const { data, error } = await db.storage
      .from('photos')
      .list(storagePath, { limit: 20, sortBy: { column: 'created_at', order: 'asc' } });
    if (error || !data || data.length === 0) return [];
    return data
      .filter((f) => f.name && /\.(jpg|jpeg|png)$/i.test(f.name))
      .map((f) => `${STORAGE_BASE}/${storagePath}/${f.name}`);
  }

async function runClaudeOcr(apiKey, system, user, photoUrls) {
    const imageBlocks = photoUrls.flatMap((url, i) => [
          { type: 'text', text: `Photo ${i + 1}:` },
          { type: 'image', source: { type: 'url', url } },
        ]);

    const resp = await fetch(ANTHROPIC_API, {
          method: 'POST',
          headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
          body: JSON.stringify({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 1024,
                  system,
                  messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: user }] }],
                }),
        });

    if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error?.message || `Claude API error ${resp.status}`);
        }

    const data = await resp.json();
    const raw = (data.content.find((b) => b.type === 'text')?.text || '')
      .replace(/```json|```/g, '')
      .trim();
    return JSON.parse(raw);
  }

export async function POST(request) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const { lotId } = await request.json();
    if (!lotId) return NextResponse.json({ error: 'lotId required' }, { status: 400 });

    const db = await createServerSupabaseClient();

    const { data: lot, error: lotError } = await db
      .from('lots')
      .select('id, org_id')
      .eq('id', lotId)
      .single();

    if (lotError || !lot) {
          return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
        }

    // Storage path root is the org_id (the UUID we identified earlier)
    const userId = lot.org_id;
    const updates = { ocr_extracted_at: new Date().toISOString() };
    const results = {};

    for (const [key, prompt] of Object.entries(PROMPTS)) {
          try {
                  const urls = await getPhotoUrls(db, userId, prompt.prefix);
                  if (urls.length === 0) {
                            results[key] = { error: 'no_photos' };
                            continue;
                          }

                  const parsed = await runClaudeOcr(apiKey, prompt.system, prompt.user, urls);
                  results[key] = parsed;

                  if (key === 'scale') {
                            updates.ocr_weight_kg = parsed.total_kg ?? null;
                            updates.ocr_weight_readings = parsed.readings ?? null;
                            updates.ocr_weight_confidence = rollupConfidence(parsed.readings);
                          } else if (key === 'ferment') {
                            updates.ocr_max_temp_celsius = parsed.max_temp_celsius ?? null;
                            updates.ocr_temp_readings = parsed.readings ?? null;
                            updates.ocr_temp_confidence = rollupConfidence(parsed.readings);
                          } else if (key === 'moisture') {
                            updates.ocr_moisture_percent = parsed.average_moisture_percent ?? null;
                            updates.ocr_moisture_readings = parsed.readings ?? null;
                            updates.ocr_moisture_confidence = rollupConfidence(parsed.readings);
                          }
                } catch (err) {
                  results[key] = { error: String(err) };
                }
        }

    const { error: updateError } = await db.from('lots').update(updates).eq('id', lotId);
    if (updateError) {
          return NextResponse.json({ error: 'db_update_failed', detail: updateError.message }, { status: 500 });
        }

    return NextResponse.json({ ok: true, lotId, results });
  }
