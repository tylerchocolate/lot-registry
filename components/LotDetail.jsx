'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LotEditor from './LotEditor';
import PhytoCertUpload from './PhytoCertUpload';
import ExportDocsPanel from './ExportDocsPanel';
import OcrPanel from './OcrPanel';

const MINT = '#90EE82', ORANGE = '#F5921E', BORDER = '#1e1e1c', CARD = '#0d0d0b', DIM = '#888882';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  const map = {
    registered: { bg: '#90EE8218', color: MINT,      border: '#90EE8244', label: 'Registered' },
    pending:    { bg: '#F5921E18', color: ORANGE,    border: '#F5921E44', label: 'Pending' },
    rejected:   { bg: '#FF5A5A18', color: '#FF5A5A', border: '#FF5A5A44', label: 'Rejected' },
  };
  const s = map[status] ?? { bg: '#ffffff10', color: '#888', border: '#ffffff22', label: status ?? 'Unknown' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

const TABS = [
  { id: 'details',   label: 'Lot Details' },
  { id: 'documents', label: 'Documents' },
];

export default function LotDetail({ lot, exportDocs, phytoSignedUrl }) {
  const router = useRouter();
  const [tab, setTab] = useState('details');

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
            Lots
          </button>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: MINT }}>{lot.id}</span>
        </div>
        <StatusPill status={lot.status}/>
      </div>

      {/* Hero */}
      <div style={{ marginTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 24, color: '#f0f0ea', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {lot.farm_name ?? lot.id}
        </h1>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            ['Location', [lot.municipality, lot.department].filter(Boolean).join(', ')],
            ['Weight',   lot.net_weight ? `${Number(lot.net_weight).toLocaleString()} kg` : null],
            ['Bags',     lot.bag_count],
            ['Harvest',  fmt(lot.harvest_date)],
            ['Buyer',    lot.buyer],
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
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === t.id ? '#1a1a18' : 'transparent', color: tab === t.id ? MINT : '#555', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'details' && (
        <div>
          <OcrPanel lot={lot} />
          <LotEditor lot={lot} />
        </div>
      )}
      {tab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PhytoCertUpload lot={lot} phytoSignedUrl={phytoSignedUrl} />
          <ExportDocsPanel lotId={lot.id} docs={exportDocs} />
        </div>
      )}
    </div>
  );
}
