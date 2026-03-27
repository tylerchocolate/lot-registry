'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase';

const MINT = '#90EE82', BORDER = '#1e1e1c', DIM = '#888882';

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 11, color: '#444', marginBottom: 6 }}>{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '9px 12px', background: '#111110',
        border: `1px solid ${focused ? MINT : BORDER}`,
        borderRadius: 8, color: '#e8e8e2', fontSize: 13, outline: 'none',
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '9px 12px', background: '#111110',
        border: `1px solid ${focused ? MINT : BORDER}`,
        borderRadius: 8, color: '#e8e8e2', fontSize: 13, outline: 'none',
        resize: 'vertical', fontFamily: 'inherit',
      }}
    />
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', paddingBottom: 12, borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }}>
      {children}
    </div>
  );
}

export default function LotEditor({ lot }) {
  const router = useRouter();

  // Form state — mirrors editable DB columns
  const [fields, setFields] = useState({
    farm_name:      lot.farm_name      ?? '',
    municipality:   lot.municipality   ?? '',
    department:     lot.department     ?? '',
    altitude:       lot.altitude       ?? '',
    producer:       typeof lot.producer === 'string' ? lot.producer : (lot.producer?.name ?? ''),
    net_weight:     lot.net_weight     ?? '',
    gross_weight:   lot.gross_weight   ?? '',
    bag_count:      lot.bag_count      ?? '',
    harvest_date:   lot.harvest_date   ? lot.harvest_date.split('T')[0] : '',
    fermentor_type: lot.fermentor_type ?? '',
    ferment_days:   lot.ferment_days   ?? '',
    ferment_notes:  lot.ferment_notes  ?? '',
    dry_method:     lot.dry_method     ?? '',
    dry_days:       lot.dry_days       ?? '',
    final_moisture: lot.final_moisture ?? '',
    dry_notes:      lot.dry_notes      ?? '',
    buyer:          lot.buyer          ?? '',
    dispatch_date:  lot.dispatch_date  ? lot.dispatch_date.split('T')[0] : '',
    transport_ref:  lot.transport_ref  ?? '',
    observations:   lot.observations   ?? '',
    farm_ica:       lot.farm_ica       ?? '',
    status:         lot.status         ?? 'registered',
  });

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState(null);

  const set = key => val => setFields(f => ({ ...f, [key]: val }));

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const db = createBrowserClient();
    const { error: dbErr } = await db
      .from('lots')
      .update({
        farm_name:      fields.farm_name      || null,
        municipality:   fields.municipality   || null,
        department:     fields.department     || null,
        altitude:       fields.altitude       || null,
        producer:       fields.producer       || null,
        net_weight:     fields.net_weight     ? Number(fields.net_weight)   : null,
        gross_weight:   fields.gross_weight   ? Number(fields.gross_weight) : null,
        bag_count:      fields.bag_count      ? Number(fields.bag_count)    : null,
        harvest_date:   fields.harvest_date   || null,
        fermentor_type: fields.fermentor_type || null,
        ferment_days:   fields.ferment_days   ? Number(fields.ferment_days) : null,
        ferment_notes:  fields.ferment_notes  || null,
        dry_method:     fields.dry_method     || null,
        dry_days:       fields.dry_days       ? Number(fields.dry_days)     : null,
        final_moisture: fields.final_moisture ? Number(fields.final_moisture) : null,
        dry_notes:      fields.dry_notes      || null,
        buyer:          fields.buyer          || null,
        dispatch_date:  fields.dispatch_date  || null,
        transport_ref:  fields.transport_ref  || null,
        observations:   fields.observations   || null,
        farm_ica:       fields.farm_ica       || null,
        status:         fields.status,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', lot.id);

    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Origin */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Origin</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Farm name">
            <Input value={fields.farm_name} onChange={set('farm_name')} placeholder="Finca La Esperanza"/>
          </Field>
          <div style={grid2}>
            <Field label="Municipality"><Input value={fields.municipality} onChange={set('municipality')} placeholder="La Palma"/></Field>
            <Field label="Department"><Input value={fields.department} onChange={set('department')} placeholder="Cundinamarca"/></Field>
          </div>
          <div style={grid2}>
            <Field label="Altitude"><Input value={fields.altitude} onChange={set('altitude')} placeholder="1,050 masl"/></Field>
            <Field label="Farm ICA number"><Input value={fields.farm_ica} onChange={set('farm_ica')} placeholder="ICA-2024-001"/></Field>
          </div>
          <Field label="Producer / Association">
            <Input value={fields.producer} onChange={set('producer')} placeholder="Asociación de Cacaoteros…"/>
          </Field>
        </div>
      </div>

      {/* Harvest & Weight */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Harvest & Weight</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Harvest date">
            <Input type="date" value={fields.harvest_date} onChange={set('harvest_date')}/>
          </Field>
          <div style={grid2}>
            <Field label="Net weight (kg)"><Input type="number" value={fields.net_weight} onChange={set('net_weight')} placeholder="2400"/></Field>
            <Field label="Gross weight (kg)"><Input type="number" value={fields.gross_weight} onChange={set('gross_weight')} placeholder="2460"/></Field>
          </div>
          <Field label="Bag count">
            <Input type="number" value={fields.bag_count} onChange={set('bag_count')} placeholder="60"/>
          </Field>
        </div>
      </div>

      {/* Fermentation */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Fermentation</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={grid2}>
            <Field label="Fermentor type"><Input value={fields.fermentor_type} onChange={set('fermentor_type')} placeholder="Wooden box — double stage"/></Field>
            <Field label="Fermentation days"><Input type="number" value={fields.ferment_days} onChange={set('ferment_days')} placeholder="6"/></Field>
          </div>
          <Field label="Notes">
            <Textarea value={fields.ferment_notes} onChange={set('ferment_notes')} placeholder="Any notes on fermentation process…"/>
          </Field>
        </div>
      </div>

      {/* Drying */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Drying</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={grid2}>
            <Field label="Drying method"><Input value={fields.dry_method} onChange={set('dry_method')} placeholder="Solar + raised African beds"/></Field>
            <Field label="Drying days"><Input type="number" value={fields.dry_days} onChange={set('dry_days')} placeholder="8"/></Field>
          </div>
          <Field label="Final moisture (%)">
            <Input type="number" value={fields.final_moisture} onChange={set('final_moisture')} placeholder="6.8"/>
          </Field>
          <Field label="Notes">
            <Textarea value={fields.dry_notes} onChange={set('dry_notes')} placeholder="Any notes on drying process…"/>
          </Field>
        </div>
      </div>

      {/* Dispatch */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Dispatch & Buyer</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Buyer"><Input value={fields.buyer} onChange={set('buyer')} placeholder="Altromercato"/></Field>
          <div style={grid2}>
            <Field label="Dispatch date"><Input type="date" value={fields.dispatch_date} onChange={set('dispatch_date')}/></Field>
            <Field label="Transport reference"><Input value={fields.transport_ref} onChange={set('transport_ref')} placeholder="HLCU1234567890"/></Field>
          </div>
          <Field label="Observations">
            <Textarea value={fields.observations} onChange={set('observations')} placeholder="Any additional observations…"/>
          </Field>
        </div>
      </div>

      {/* Status */}
      <div style={{ background: '#0d0d0b', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
        <SectionTitle>Status</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          {['registered', 'pending', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => set('status')(s)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1px solid ${fields.status === s ? MINT : BORDER}`,
                background: fields.status === s ? '#90EE8218' : 'transparent',
                color: fields.status === s ? MINT : '#555',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, color: '#ff8080', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: saved ? '#90EE8233' : saving ? '#90EE8266' : MINT, color: saved ? MINT : '#000', border: saved ? `1px solid ${MINT}` : 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
        >
          {saving && <div style={{ width: 14, height: 14, border: '2px solid #00000033', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>}
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: 12, color: MINT }}>Changes saved to Supabase</span>}
      </div>
    </div>
  );
}
