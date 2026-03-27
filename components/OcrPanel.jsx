'use client';
import { useState, useEffect } from 'react';

const MINT = '#90EE82';
const ORANGE = '#F5921E';
const BORDER = '#1e1e1c';

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const map = {
    high:       { label: 'Auto-read',             bg: '#0d2a0d', color: MINT,      border: '#1e3a1e' },
    medium:     { label: 'Verify',                bg: '#2a1800', color: ORANGE,    border: '#3a2200' },
    unreadable: { label: 'Manual entry required', bg: '#2a0000', color: '#ff6b6b', border: '#3a0000' },
  };
  const s = map[confidence] ?? map.medium;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

function OcrField({ label, value, unit, confidence, fieldKey, lotId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value != null ? String(value) : '');
  }, [value]);

  async function save() {
    const num = parseFloat(draft);
    if (isNaN(num)) return;
    setSaving(true);
    try {
      await fetch('/api/ocr-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, field: fieldKey, value: num }),
      });
      onSaved(fieldKey, num);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1c', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <input
              type="number" step="0.1" value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              style={{
                background: '#111', border: '1px solid #444', borderRadius: 4,
                color: '#fff', fontSize: 18, fontWeight: 700, padding: '4px 8px',
                width: 100, fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 13, color: '#888' }}>{unit}</span>
            <button onClick={save} disabled={saving} style={{
              background: MINT, color: '#000', border: 'none', borderRadius: 4,
              padding: '5px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} style={{
              background: 'none', border: '1px solid #333', borderRadius: 4,
              color: '#777', fontSize: 11, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24, fontWeight: 800, color: value != null ? '#f0f0ea' : '#444', fontVariantNumeric: 'tabular-nums', flex: 1 }}>
              {value != null ? `${value} ${unit}` : '—'}
            </span>
            {value != null && <ConfidenceBadge confidence={confidence} />}
            <button
              onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
              style={{
                background: 'none', border: '1px solid #2a2a2a', borderRadius: 4,
                color: '#666', fontSize: 11, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OcrPanel({ lot }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [values, setValues] = useState({
    ocr_weight_kg:           lot.ocr_weight_kg,
    ocr_weight_confidence:   lot.ocr_weight_confidence,
    ocr_max_temp_celsius:    lot.ocr_max_temp_celsius,
    ocr_temp_confidence:     lot.ocr_temp_confidence,
    ocr_moisture_percent:    lot.ocr_moisture_percent,
    ocr_moisture_confidence: lot.ocr_moisture_confidence,
    ocr_extracted_at:        lot.ocr_extracted_at,
  });

  const hasData = values.ocr_weight_kg != null || values.ocr_max_temp_celsius != null || values.ocr_moisture_percent != null;

  useEffect(() => {
    if (!hasData && !values.ocr_extracted_at) {
      runExtraction();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function rollup(readings) {
    if (!readings?.length) return 'unreadable';
    const vals = readings.map(r => r.confidence);
    if (vals.every(v => v === 'high')) return 'high';
    if (vals.some(v => v === 'unreadable')) return 'unreadable';
    return 'medium';
  }

  async function runExtraction() {
    setStatus('running');
    setErrorMsg('');
    try {
      const res = await fetch('/api/extract-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? 'Extraction failed'); setStatus('error'); return; }
      const next = { ...values, ocr_extracted_at: new Date().toISOString() };
      if (json.results?.scale)    { next.ocr_weight_kg = json.results.scale.total_kg ?? null; next.ocr_weight_confidence = json.results.scale.readings ? rollup(json.results.scale.readings) : null; }
      if (json.results?.ferment)  { next.ocr_max_temp_celsius = json.results.ferment.max_temp_celsius ?? null; next.ocr_temp_confidence = json.results.ferment.readings ? rollup(json.results.ferment.readings) : null; }
      if (json.results?.moisture) { next.ocr_moisture_percent = json.results.moisture.average_moisture_percent ?? null; next.ocr_moisture_confidence = json.results.moisture.readings ? rollup(json.results.moisture.readings) : null; }
      setValues(next);
      setStatus('done');
    } catch (err) { setErrorMsg(String(err)); setStatus('error'); }
  }

  function handleSaved(key, val) { setValues(v => ({ ...v, [key]: val })); }

  const extractedAt = values.ocr_extracted_at
    ? new Date(values.ocr_extracted_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div style={{ background: '#0d0d0b', border: '1px solid #1e2e1e', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: MINT, fontSize: 13 }}>◈</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#d0d0cc', flex: 1 }}>Auto-extracted values</span>
        {status === 'running'
          ? <span style={{ fontSize: 12, color: MINT }}>↻ Analyzing photos…</span>
          : extractedAt
            ? <span style={{ fontSize: 11, color: '#555' }}>Last run {extractedAt}</span>
            : null
        }
        <button
          onClick={runExtraction}
          disabled={status === 'running'}
          style={{
            background: 'transparent', color: status === 'running' ? '#444' : '#777',
            border: '1px solid #2a2a2a', borderRadius: 5, padding: '5px 12px',
            fontFamily: 'inherit', fontWeight: 600, fontSize: 11,
            cursor: status === 'running' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {hasData ? 'Re-extract' : 'Extract from photos'}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ margin: '12px 16px', padding: '8px 12px', background: '#1a0e00', border: '1px solid #2a1800', borderRadius: 5, fontSize: 12, color: ORANGE }}>
          {errorMsg}
        </div>
      )}
      <div>
        <OcrField label="Total received weight" value={values.ocr_weight_kg}        unit="kg" confidence={values.ocr_weight_confidence}   fieldKey="ocr_weight_kg"        lotId={lot.id} onSaved={handleSaved} />
        <OcrField label="Max fermentation temp"  value={values.ocr_max_temp_celsius} unit="°C" confidence={values.ocr_temp_confidence}     fieldKey="ocr_max_temp_celsius" lotId={lot.id} onSaved={handleSaved} />
        <OcrField label="Avg moisture"           value={values.ocr_moisture_percent} unit="%" confidence={values.ocr_moisture_confidence} fieldKey="ocr_moisture_percent" lotId={lot.id} onSaved={handleSaved} />
      </div>
    </div>
  );
}'use client';
import { useState, useEffect } from 'react';

const MINT = '#90EE82';
const ORANGE = '#F5921E';
const BORDER = '#1e1e1c';

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const map = {
    high:       { label: 'Auto-read',             bg: '#0d2a0d', color: MINT,      border: '#1e3a1e' },
    medium:     { label: 'Verify',                bg: '#2a1800', color: ORANGE,    border: '#3a2200' },
    unreadable: { label: 'Manual entry required', bg: '#2a0000', color: '#ff6b6b', border: '#3a0000' },
  };
  const s = map[confidence] ?? map.medium;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

function OcrField({ label, value, unit, confidence, fieldKey, lotId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value != null ? String(value) : '');
  }, [value]);

  async function save() {
    const num = parseFloat(draft);
    if (isNaN(num)) return;
    setSaving(true);
    try {
      await fetch('/api/ocr-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, field: fieldKey, value: num }),
      });
      onSaved(fieldKey, num);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1c', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <input
              type="number" step="0.1" value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              style={{
                background: '#111', border: '1px solid #444', borderRadius: 4,
                color: '#fff', fontSize: 18, fontWeight: 700, padding: '4px 8px',
                width: 100, fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 13, color: '#888' }}>{unit}</span>
            <button onClick={save} disabled={saving} style={{
              background: MINT, color: '#000', border: 'none', borderRadius: 4,
              padding: '5px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} style={{
              background: 'none', border: '1px solid #333', borderRadius: 4,
              color: '#777', fontSize: 11, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24, fontWeight: 800, color: value != null ? '#f0f0ea' : '#444', fontVariantNumeric: 'tabular-nums', flex: 1 }}>
              {value != null ? `${value} ${unit}` : '—'}
            </span>
            {value != null && <ConfidenceBadge confidence={confidence} />}
            <button
              onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
              style={{
                background: 'none', border: '1px solid #2a2a2a', borderRadius: 4,
                color: '#666', fontSize: 11, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OcrPanel({ lot }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [values, setValues] = useState({
    ocr_weight_kg:           lot.ocr_weight_kg,
    ocr_weight_confidence:   lot.ocr_weight_confidence,
    ocr_max_temp_celsius:    lot.ocr_max_temp_celsius,
    ocr_temp_confidence:     lot.ocr_temp_confidence,
    ocr_moisture_percent:    lot.ocr_moisture_percent,
    ocr_moisture_confidence: lot.ocr_moisture_confidence,
    ocr_extracted_at:        lot.ocr_extracted_at,
  });

  const hasData = values.ocr_weight_kg != null || values.ocr_max_temp_celsius != null || values.ocr_moisture_percent != null;

  useEffect(() => {
    if (!hasData && !values.ocr_extracted_at) {
      runExtraction();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function rollup(readings) {
    if (!readings?.length) return 'unreadable';
    const vals = readings.map(r => r.confidence);
    if (vals.every(v => v === 'high')) return 'high';
    if (vals.some(v => v === 'unreadable')) return 'unreadable';
    return 'medium';
  }

  async function runExtraction() {
    setStatus('running');
    setErrorMsg('');
    try {
      const res = await fetch('/api/extract-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id }),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? 'Extraction failed'); setStatus('error'); return; }
      const next = { ...values, ocr_extracted_at: new Date().toISOString() };
      if (json.results?.scale)    { next.ocr_weight_kg = json.results.scale.total_kg ?? null; next.ocr_weight_confidence = json.results.scale.readings ? rollup(json.results.scale.readings) : null; }
      if (json.results?.ferment)  { next.ocr_max_temp_celsius = json.results.ferment.max_temp_celsius ?? null; next.ocr_temp_confidence = json.results.ferment.readings ? rollup(json.results.ferment.readings) : null; }
      if (json.results?.moisture) { next.ocr_moisture_percent = json.results.moisture.average_moisture_percent ?? null; next.ocr_moisture_confidence = json.results.moisture.readings ? rollup(json.results.moisture.readings) : null; }
      setValues(next);
      setStatus('done');
    } catch (err) { setErrorMsg(String(err)); setStatus('error'); }
  }

  function handleSaved(key, val) { setValues(v => ({ ...v, [key]: val })); }

  const extractedAt = values.ocr_extracted_at
    ? new Date(values.ocr_extracted_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div style={{ background: '#0d0d0b', border: '1px solid #1e2e1e', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: MINT, fontSize: 13 }}>◈</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#d0d0cc', flex: 1 }}>Auto-extracted values</span>
        {status === 'running'
          ? <span style={{ fontSize: 12, color: MINT }}>↻ Analyzing photos…</span>
          : extractedAt
            ? <span style={{ fontSize: 11, color: '#555' }}>Last run {extractedAt}</span>
            : null
        }
        <button
          onClick={runExtraction}
          disabled={status === 'running'}
          style={{
            background: 'transparent', color: status === 'running' ? '#444' : '#777',
            border: '1px solid #2a2a2a', borderRadius: 5, padding: '5px 12px',
            fontFamily: 'inherit', fontWeight: 600, fontSize: 11,
            cursor: status === 'running' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {hasData ? 'Re-extract' : 'Extract from photos'}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ margin: '12px 16px', padding: '8px 12px', background: '#1a0e00', border: '1px solid #2a1800', borderRadius: 5, fontSize: 12, color: ORANGE }}>
          {errorMsg}
        </div>
      )}
      <div>
        <OcrField label="Total received weight" value={values.ocr_weight_kg}        unit="kg" confidence={values.ocr_weight_confidence}   fieldKey="ocr_weight_kg"        lotId={lot.id} onSaved={handleSaved} />
        <OcrField label="Max fermentation temp"  value={values.ocr_max_temp_celsius} unit="°C" confidence={values.ocr_temp_confidence}     fieldKey="ocr_max_temp_celsius" lotId={lot.id} onSaved={handleSaved} />
        <OcrField label="Avg moisture"           value={values.ocr_moisture_percent} unit="%" confidence={values.ocr_moisture_confidence} fieldKey="ocr_moisture_percent" lotId={lot.id} onSaved={handleSaved} />
      </div>
    </div>
  );
