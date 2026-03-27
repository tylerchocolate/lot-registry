'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase';

const MINT = '#90EE82', ORANGE = '#F5921E', BORDER = '#1e1e1c', CARD = '#0d0d0b', DIM = '#888882';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  const map = {
    registered: { bg: '#90EE8218', color: MINT,    border: '#90EE8244', label: 'Registered' },
    pending:    { bg: '#F5921E18', color: ORANGE,   border: '#F5921E44', label: 'Pending' },
    rejected:   { bg: '#FF5A5A18', color: '#FF5A5A',border: '#FF5A5A44', label: 'Rejected' },
  };
  const s = map[status] ?? { bg: '#ffffff10', color: '#888', border: '#ffffff22', label: status ?? 'Unknown' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

export default function LotsList({ lots }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const filtered = lots.filter(l => {
    const q = search.toLowerCase();
    return !q
      || l.id?.toLowerCase().includes(q)
      || l.farm_name?.toLowerCase().includes(q)
      || l.municipality?.toLowerCase().includes(q)
      || l.buyer?.toLowerCase().includes(q);
  });

  async function handleLogout() {
    setLoggingOut(true);
    const db = createBrowserClient();
    await db.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 20, color: MINT }}>Provnr</span>
          <span style={{ color: '#333', fontSize: 14, marginLeft: 4 }}>/</span>
          <span style={{ color: '#666', fontSize: 13, fontWeight: 500, marginLeft: 4 }}>Registro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#444' }}>registro.provnr.com</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 7, color: '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Title + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 22, color: '#f0f0ea', letterSpacing: '-0.01em' }}>Lots</h1>
          <p style={{ fontSize: 12, color: DIM, marginTop: 3 }}>{lots.length} total · {filtered.length} shown</p>
        </div>
        <input
          type="search"
          placeholder="Search by lot ID, farm, municipality, buyer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 14px', background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#e8e8e2', fontSize: 13, outline: 'none', width: 320 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 140px 100px 100px 90px 80px', gap: 0, padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: '#0a0a08' }}>
          {['Lot ID', 'Farm', 'Municipality', 'Weight', 'Bags', 'Harvest', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#333', fontSize: 13 }}>
            {search ? 'No lots match your search.' : 'No lots yet.'}
          </div>
        )}
        {filtered.map((lot, i) => (
          <div
            key={lot.id}
            onClick={() => router.push(`/lots/${lot.id}`)}
            style={{
              display: 'grid', gridTemplateColumns: '180px 1fr 140px 100px 100px 90px 80px',
              gap: 0, padding: '14px 20px', cursor: 'pointer',
              borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
              transition: 'background .1s',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#111110'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: MINT }}>{lot.id}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0da' }}>{lot.farm_name ?? '—'}</div>
              {lot.phyto_cert_number && (
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>📄 {lot.phyto_cert_number}</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: DIM }}>{lot.municipality ?? '—'}</div>
            <div style={{ fontSize: 12, color: '#ccc' }}>{lot.net_weight ? `${Number(lot.net_weight).toLocaleString()} kg` : '—'}</div>
            <div style={{ fontSize: 12, color: '#ccc' }}>{lot.bag_count ?? '—'}</div>
            <div style={{ fontSize: 12, color: DIM }}>{fmt(lot.harvest_date)}</div>
            <div><StatusPill status={lot.status}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}
