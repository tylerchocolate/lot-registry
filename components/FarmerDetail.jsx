'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import FarmerQR from './FarmerQR';

const MINT   = '#90EE82';
const ORANGE = '#F5921E';
const BORDER = '#1e1e1c';
const CARD   = '#0d0d0b';
const DIM    = '#888882';

const sb = typeof window !== 'undefined'
  ? (window.__supabaseBrowserClient ??= createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://nlcpgqutjscdmxzmkckb.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sY3BncXV0anNjZG14em1rY2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDg2MjUsImV4cCI6MjA4NTYyNDYyNX0.56egK34vwTX2ik782SY_Q_NfCdJV_dqq3d_YMiXJZXg'
    ))
  : null;

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        style={{ background: '#0a0a08', border: `1px solid ${BORDER}`, borderRadius: 7, color: '#d8d8d0', fontSize: 13, padding: '9px 12px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  );
}

const TABS = [
  { id: 'profile',   label: 'Perfil' },
  { id: 'qr',        label: 'Código QR' },
  { id: 'deliveries',label: 'Entregas' },
];

export default function FarmerDetail({ farmer, deliveries, role, orgName, orgCode }) {
  const router = useRouter();
  const [tab, setTab]     = useState('profile');
  const [form, setForm]   = useState({ ...farmer });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [err, setErr]         = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const set = (field) => (val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    setSaving(true); setErr(''); setSaved(false);
    try {
      const { error } = await sb.from('farmers').update({
        full_name:     form.full_name?.trim()    || null,
        farm_name:     form.farm_name?.trim()    || null,
        municipality:  form.municipality?.trim() || null,
        department:    form.department?.trim()   || null,
        phone:         form.phone?.trim()        || null,
        ica_number:    form.ica_number?.trim()   || null,
        altitude_masl: form.altitude_masl ? Number(form.altitude_masl) : null,
        notes:         form.notes?.trim()        || null,
        updated_at:    new Date().toISOString(),
      }).eq('id', farmer.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (e) {
      setErr(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const action = farmer.active ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que quieres ${action} este agricultor?`)) return;
    setDeactivating(true);
    await sb.from('farmers').update({ active: !farmer.active }).eq('id', farmer.id);
    setDeactivating(false);
    router.refresh();
  };

  const totalKg = deliveries
    .filter(d => d.wet_weight_kg)
    .reduce((s, d) => s + Number(d.wet_weight_kg), 0);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/farmers')}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7, color: '#555', padding: '5px 10px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Agricultores
          </button>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontSize: 13, color: DIM, fontFamily: 'monospace' }}>{farmer.id.slice(0, 8)}…</span>
        </div>
        <span style={{
          background: farmer.active ? '#90EE8218' : '#ffffff10',
          color: farmer.active ? MINT : '#555',
          border: `1px solid ${farmer.active ? '#90EE8244' : '#ffffff22'}`,
          borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
        }}>
          {farmer.active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Hero */}
      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 24, color: '#f0f0ea', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {farmer.full_name}
        </h1>
        {/* Association badge — anchors this farmer to their org */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: 8, padding: '5px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Asociación</span>
          <span style={{ fontSize: 13, color: MINT, fontWeight: 700 }}>{orgName}</span>
          {orgCode && <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>{orgCode}</span>}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            ['Finca',      farmer.farm_name],
            ['Municipio',  farmer.municipality],
            ['Altitud',    farmer.altitude_masl ? `${farmer.altitude_masl} msnm` : null],
            ['Entregas',   deliveries.length > 0 ? `${deliveries.length} registradas` : null],
            ['Total',      totalKg > 0 ? `${totalKg.toFixed(0)} kg húmedo` : null],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l}>
              <span style={{ fontSize: 11, color: '#555' }}>{l} </span>
              <span style={{ fontSize: 12, color: '#999' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0a0a08', borderRadius: 10, border: `1px solid ${BORDER}`, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === t.id ? '#1a1a18' : 'transparent', color: tab === t.id ? MINT : '#555', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
              Información personal
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nombre completo *" value={form.full_name} onChange={set('full_name')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nombre de la finca" value={form.farm_name} onChange={set('farm_name')} />
                <Field label="Teléfono" value={form.phone} onChange={set('phone')} type="tel" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Municipio" value={form.municipality} onChange={set('municipality')} />
                <Field label="Departamento" value={form.department} onChange={set('department')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Altitud (msnm)" value={form.altitude_masl} onChange={set('altitude_masl')} type="number" />
                <Field label="Número ICA" value={form.ica_number} onChange={set('ica_number')} />
              </div>
              <Field label="Notas" value={form.notes} onChange={set('notes')} />
            </div>
          </div>

          {err && <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0 }}>{err}</p>}
          {saved && <p style={{ fontSize: 12, color: MINT, margin: 0 }}>✓ Cambios guardados</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, background: saving ? '#333' : MINT, border: 'none', borderRadius: 8, color: '#000', padding: '11px 0', fontSize: 13, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={handleToggleActive} disabled={deactivating}
              style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: farmer.active ? '#ff6b6b' : MINT, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {farmer.active ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
        </div>
      )}

      {/* QR tab */}
      {tab === 'qr' && (
        <FarmerQR farmer={farmer} orgName={orgName} orgCode={orgCode} />
      )}

      {/* Deliveries tab */}
      {tab === 'deliveries' && (
        <div>
          {deliveries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: DIM }}>
              Este agricultor no tiene entregas registradas aún.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Entregas totales', deliveries.length],
                  ['Peso húmedo total', totalKg > 0 ? `${totalKg.toFixed(0)} kg` : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f0ea', fontFamily: 'Nunito, sans-serif' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Delivery rows */}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', background: '#0a0a08', borderBottom: `1px solid ${BORDER}`, padding: '10px 16px' }}>
                  {['Lote', 'Fecha', 'Peso húmedo', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{h}</span>
                  ))}
                </div>
                {deliveries.map((d, i) => (
                  <div key={d.id}
                    onClick={() => router.push(`/lots/${d.lot_id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', padding: '12px 16px', borderBottom: i < deliveries.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f0f0d'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: MINT }}>{d.lot_id}</span>
                    <span style={{ fontSize: 13, color: '#999' }}>{fmt(d.delivered_at)}</span>
                    <span style={{ fontSize: 13, color: d.wet_weight_kg ? '#d8d8d0' : '#444', fontWeight: d.wet_weight_kg ? 700 : 400 }}>
                      {d.wet_weight_kg ? `${Number(d.wet_weight_kg).toFixed(1)} kg` : '—'}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
