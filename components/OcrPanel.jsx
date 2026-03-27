'use client';
import { useState, useEffect } from 'react';

const MINT = '#90EE82';
const ORANGE = '#F5921E';

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
      padding: '2px 8px', borderRadius: 3, whiteSpace: 'nowrap',
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
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid #252525',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 11,
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <input
              type="number"
              step="0.1"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              style={{
                background: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: 4,
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                padding: '4px 10px',
                width: 110,
                fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 14, color: '#aaa' }}>{unit}</span>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: MINT, color: '#000', border: 'none', borderRadius: 4,
                padding: '5px 14px', fontWeight: 800, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {saving ? '…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: 'none', border: '1px solid #444', borderRadius: 4,
                color: '#aaa', fontSize: 12, padding: '5px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span style={{
              fontSize: 26,
              fontWeight: 800,
              color: value != null ? '#ffffff' : '#555',
              fontVariantNumeric: 'tabular-nums',
              flex: 1,
              letterSpacing: '-0.02em',
            }}>
              {value != null ? `${value} ${unit}` : '—'}
            </span>
            {value != null && <ConfidenceBadge confidence={confidence} />}
            <button
              onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
              style={{
                background: 'none',
                border: '1px solid #333',
                borderRadius: 4,
                color: '#888',
                fontSize: 11,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
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
  const [errorDetail, setErrorDetail] = useState('');
  const [values, setValues] = useState({
    ocr_weight_kg:           lot.ocr_weight_kg,
    ocr_weight_confidence:   lot.ocr_weight_confidence,
    ocr_max_temp_celsius:    lot.ocr_max_temp_celsius,
    ocr_temp_confidence:     lot.ocr_temp_confidence,
    ocr_moisture_percent:    lot.ocr_moisture_percent,
    ocr_moisture_confidence: lot.ocr_moisture_confidence,
    ocr_extracted_at:        lot.ocr_extracted_at,
  });

  // Auto-run if any value is still null
  const hasAllData =
    values.ocr_weight_kg != null &&
    values.ocr_max_temp_celsius != null &&
    values.ocr_moisture_percent != null;

  useEffect(() => {
    if (!hasAllData) {
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
    setErrorDetail('');
    try {
      const res = await fetch('/api/extract-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Extraction failed');
        setErrorDetail(json.detail ?? '');
        setStatus('error');
        return;
      }
      const next = { ...values, ocr_extracted_at: new Date().toISOString() };
      if (json.results?.scale && !json.results.scale.error) {
        next.ocr_weight_kg = json.results.scale.total_kg ?? null;
        next.ocr_weight_confidence = rollup(json.results.scale.readings);
      }
      if (json.results?.ferment && !json.results.ferment.error) {
        next.ocr_max_temp_celsius = json.results.ferment.max_temp_celsius ?? null;
        next.ocr_temp_confidence = rollup(json.results.ferment.readings);
      }
      if (json.results?.moisture && !json.results.moisture.error) {
        next.ocr_moisture_percent = json.results.moisture.average_moisture_percent ?? null;
        next.ocr_moisture_confidence = rollup(json.results.moisture.readings);
      }
      setValues(next);
      // Show per-step errors if any
      const stepErrors = Object.entries(json.results || {})
        .filter(([, v]) => v.error)
        .map(([k, v]) => `${k}: ${v.error}${v.detail ? ` (${v.detail})` : ''}`)
        .join(', ');
      if (stepErrors) {
        setErrorMsg(`Partial extraction — some steps failed: ${stepErrors}`);
        setStatus('error');
      } else {
        setStatus('done');
      }
    } catch (err) {
      setErrorMsg(`Network error: ${String(err)}`);
      setStatus('error');
    }
  }

  function handleSaved(key, val) { setValues(v => ({ ...v, [key]: val })); }

  const extractedAt = values.ocr_extracted_at
    ? new Date(values.ocr_extracted_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div style={{
      background: '#111',
      border: '1px solid #2a2a2a',
      borderRadius: 8,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #252525',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <span style={{ color: MINT, fontSize: 13 }}>◈</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#e0e0dc', flex: 1 }}>
          Auto-extracted values
        </span>
        {status === 'running' ? (
          <span style={{ fontSize: 12, color: MINT }}>↻ Analyzing photos…</span>
        ) : extractedAt ? (
          <span style={{ fontSize: 11, color: '#666' }}>Last run {extractedAt}</span>
        ) : null}
        <button
          onClick={runExtraction}
          disabled={status === 'running'}
          style={{
            background: 'transparent',
            color: status === 'running' ? '#555' : '#aaa',
            border: '1px solid #333',
            borderRadius: 5,
            padding: '5px 12px',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: 11,
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'running' ? 'Running…' : 'Re-extract'}
        </button>
      </div>

      {/* Error */}
      {(status === 'error') && (
        <div style={{
          margin: '0',
          padding: '10px 20px',
          background: '#1a0e00',
          borderBottom: '1px solid #2a1800',
          fontSize: 12,
          color: ORANGE,
          lineHeight: 1.5,
        }}>
          {errorMsg}
          {errorDetail && <div style={{ color: '#aa6600', marginTop: 3, fontSize: 11 }}>{errorDetail}</div>}
        </div>
      )}

      {/* Fields */}
      <div>
        <OcrField
          label="Total received weight"
          value={values.ocr_weight_kg}
          unit="kg"
          confidence={values.ocr_weight_confidence}
          fieldKey="ocr_weight_kg"
          lotId={lot.id}
          onSaved={handleSaved}
        />
        <OcrField
          label="Max fermentation temp"
          value={values.ocr_max_temp_celsius}
          unit="°C"
          confidence={values.ocr_temp_confidence}
          fieldKey="ocr_max_temp_celsius"
          lotId={lot.id}
          onSaved={handleSaved}
        />
        <OcrField
          label="Avg moisture"
          value={values.ocr_moisture_percent}
          unit="%"
          confidence={values.ocr_moisture_confidence}
          fieldKey="ocr_moisture_percent"
          lotId={lot.id}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
