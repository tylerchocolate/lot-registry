'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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

const EMPTY_FORM = {
  full_name: '', farm_name: '', municipality: '', department: '',
  phone: '', ica_number: '', altitude_masl: '', notes: '',
};

function Input({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        {label}{required && <span style={{ color: ORANGE }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        required={required}
        style={{
          background: '#0a0a08', border: `1px solid ${BORDER}`, borderRadius: 7,
          color: '#d8d8d0', fontSize: 13, padding: '9px 12px', fontFamily: 'inherit',
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default function FarmerList({ farmers, orgId, orgName, orgCode, role }) {
  const router              = useRouter();
  const [query, setQuery]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = farmers.filter(f => {
    if (!showInactive && !f.active) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      f.full_name?.toLowerCase().includes(q) ||
      f.farm_name?.toLowerCase().includes(q) ||
      f.municipality?.toLowerCase().includes(q)
    );
  });

  const set = (field) => (val) => setForm(p => ({ ...p, [field]: val }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setErr('El nombre es obligatorio'); return; }
    setSaving(true); setErr('');
    try {
      const { error } = await sb.from('farmers').insert({
        org_id:        orgId,
        full_name:     form.full_name.trim(),
        farm_name:     form.farm_name.trim()     || null,
        municipality:  form.municipality.trim()  || null,
        department:    form.department.trim()    || null,
        phone:         form.phone.trim()         || null,
        ica_number:    form.ica_number.trim()    || null,
        altitude_masl: form.altitude_masl ? Number(form.altitude_masl) : null,
        notes:         form.notes.trim()         || null,
        active:        true,
      });
      if (error) throw error;
      setShowAdd(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (e) {
      setErr(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const activeCount   = farmers.filter(f => f.active).length;
  const inactiveCount = farmers.filter(f => !f.active).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/lots')}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 7, color: '#555', padding: '5px 10px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Lotes
          </button>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontSize: 13, color: DIM }}>Agricultores</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ background: MINT, color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          + Agregar agricultor
        </button>
      </div>

      {/* Org name + stats */}
      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 24, color: '#f0f0ea', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {orgName}
        </h1>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#999' }}><span style={{ color: MINT, fontWeight: 700 }}>{activeCount}</span> agricultores activos</span>
          {inactiveCount > 0 && (
            <span style={{ fontSize: 12, color: '#999' }}>{inactiveCount} inactivos</span>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, finca o municipio…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0a0a08', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#d8d8d0', fontSize: 13, padding: '9px 12px 9px 32px', fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        {inactiveCount > 0 && (
          <button
            onClick={() => setShowInactive(p => !p)}
            style={{ background: showInactive ? '#1a1a18' : 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: showInactive ? MINT : '#555', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            {showInactive ? '✓ ' : ''}Ver inactivos
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: DIM }}>
          {query ? `Sin resultados para "${query}"` : 'No hay agricultores registrados aún.'}
        </div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 0, background: '#0a0a08', borderBottom: `1px solid ${BORDER}`, padding: '10px 16px' }}>
            {['Agricultor', 'Finca', 'Municipio', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{h}</span>
            ))}
          </div>

          {filtered.map((f, i) => (
            <div
              key={f.id}
              onClick={() => router.push(`/farmers/${f.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 0,
                padding: '13px 16px', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: 'transparent', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#0f0f0d'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: f.active ? '#d8d8d0' : '#555', marginBottom: 2 }}>
                  {f.full_name}
                  {!f.active && <span style={{ marginLeft: 8, fontSize: 10, color: '#555', fontWeight: 400 }}>inactivo</span>}
                </div>
                {f.phone && <div style={{ fontSize: 11, color: DIM }}>{f.phone}</div>}
              </div>
              <div style={{ fontSize: 13, color: '#999', alignSelf: 'center' }}>{f.farm_name ?? '—'}</div>
              <div style={{ fontSize: 13, color: '#999', alignSelf: 'center' }}>{f.municipality ?? '—'}</div>
              <div style={{ alignSelf: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add farmer modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '40px 20px', overflowY: 'auto' }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, width: '100%', maxWidth: 520, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 18, color: '#f0f0ea', margin: 0 }}>Agregar agricultor</h2>
              <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setErr(''); }}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            {/* Association context — makes the linkage explicit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0a0a08', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Asociación</span>
              <span style={{ fontSize: 13, color: MINT, fontWeight: 700 }}>{orgName}</span>
              <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginLeft: 2 }}>{orgCode}</span>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Nombre completo" value={form.full_name} onChange={set('full_name')} required />
              <Input label="Nombre de la finca" value={form.farm_name} onChange={set('farm_name')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Municipio" value={form.municipality} onChange={set('municipality')} />
                <Input label="Departamento" value={form.department} onChange={set('department')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Teléfono" value={form.phone} onChange={set('phone')} type="tel" />
                <Input label="Altitud (msnm)" value={form.altitude_masl} onChange={set('altitude_masl')} type="number" />
              </div>
              <Input label="Número ICA" value={form.ica_number} onChange={set('ica_number')} placeholder="Opcional" />
              <Input label="Notas" value={form.notes} onChange={set('notes')} placeholder="Opcional" />

              {err && <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0 }}>{err}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setErr(''); }}
                  style={{ flex: 1, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#555', padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 2, background: saving ? '#333' : MINT, border: 'none', borderRadius: 8, color: '#000', padding: '10px 0', fontSize: 13, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Guardando…' : 'Guardar agricultor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
