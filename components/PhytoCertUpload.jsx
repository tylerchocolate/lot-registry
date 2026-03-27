'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase-browser';

const MINT = '#90EE82', ORANGE = '#F5921E', BORDER = '#1e1e1c';
const BUCKET = 'lot-documents';

async function extractCertData(file) {
  const b64 = await fileToBase64(file);

  const resp = await fetch('/api/extract-cert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData: b64, mediaType: file.type || 'application/pdf' }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Extraction failed');
  }

  return resp.json();
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function PhytoCertUpload({ lot, phytoSignedUrl: initialSignedUrl }) {
  const router = useRouter();
  const [view,        setView]        = useState(lot.phyto_cert_storage_path ? 'saved' : 'empty');
  const [extracted,   setExtracted]   = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [editNum,     setEditNum]     = useState('');
  const [signedUrl,   setSignedUrl]   = useState(initialSignedUrl);
  const [error,       setError]       = useState(null);
  const [verifying,   setVerifying]   = useState(false);

  // Current cert data (merges prop + any refresh)
  const [certData, setCertData] = useState(lot);

  async function refresh() {
    const db = createBrowserClient();
    const { data } = await db.from('lots')
      .select('phyto_cert_number,phyto_cert_storage_path,phyto_cert_extracted_data,phyto_cert_uploaded_at,phyto_cert_verified,phyto_cert_verified_at')
      .eq('id', lot.id).single();
    if (data) {
      setCertData(prev => ({ ...prev, ...data }));
      if (data.phyto_cert_storage_path) {
        const { data: su } = await createBrowserClient().storage.from(BUCKET).createSignedUrl(data.phyto_cert_storage_path, 3600);
        if (su) setSignedUrl(su.signedUrl);
      }
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setPendingFile(file); setView('extracting'); setError(null);
    try {
      const result = await extractCertData(file);
      setExtracted(result);
      setEditNum(result.certificate_number || '');
      setView('review');
    } catch (e) { setError(e.message); setView('error'); }
  }

  async function handleSave() {
    setView('saving');
    const db = createBrowserClient();
    const ext  = pendingFile.name.split('.').pop();
    const path = `lots/${lot.id}/phytosanitary/${Date.now()}.${ext}`;

    const { error: upErr } = await db.storage.from(BUCKET).upload(path, pendingFile, { upsert: true, contentType: pendingFile.type || 'application/pdf' });
    if (upErr) { setError(upErr.message); setView('error'); return; }

    const payload = { ...extracted, certificate_number: editNum };
    const { error: dbErr } = await db.from('lots').update({
      phyto_cert_number:         editNum,
      phyto_cert_storage_path:   path,
      phyto_cert_extracted_data: payload,
      phyto_cert_uploaded_at:    new Date().toISOString(),
      phyto_cert_verified:       false,
      phyto_cert_verified_by:    null,
      phyto_cert_verified_at:    null,
    }).eq('id', lot.id);

    if (dbErr) { setError(dbErr.message); setView('error'); return; }
    await refresh();
    setPendingFile(null); setExtracted(null);
    setView('saved');
    router.refresh();
  }

  async function handleVerify() {
    setVerifying(true);
    const db = createBrowserClient();
    if (certData.phyto_cert_verified) {
      await db.from('lots').update({ phyto_cert_verified: false, phyto_cert_verified_by: null, phyto_cert_verified_at: null }).eq('id', lot.id);
    } else {
      await db.rpc('verify_phyto_cert', { p_lot_id: lot.id });
    }
    await refresh();
    setVerifying(false);
    router.refresh();
  }

  const card   = { background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' };
  const pad    = { padding: '16px 20px' };
  const div    = { borderTop: `1px solid ${BORDER}` };
  const row    = { display: 'flex', alignItems: 'center', gap: 8 };
  const ex     = extracted;
  const d      = certData;

  const Field = ({ label, value, accent }) => (
    <div>
      <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: accent ? ORANGE : '#e0e0da', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );

  const BtnPrimary = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: disabled ? '#90EE8244' : MINT, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{children}</button>
  );

  const BtnGhost = ({ onClick, disabled, danger, children }) => (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', color: danger ? '#ff8080' : '#666', border: `1px solid ${danger ? 'rgba(255,80,80,0.25)' : BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{children}</button>
  );

  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
        Phytosanitary Certificate
      </div>

      {view === 'error' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, color: '#ff8080', fontSize: 12, marginBottom: 10 }}>{error}</div>
          <BtnGhost onClick={() => { setError(null); setView('empty'); }}>Try again</BtnGhost>
        </div>
      )}

      {view === 'empty' && (
        <label onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1.5px dashed #90EE8233`, borderRadius: 12, padding: '40px 32px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
          <input type="file" accept=".pdf,image/*" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}/>
          <div style={{ width: 44, height: 44, background: '#90EE8212', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MINT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div style={{ color: '#e0e0da', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Upload ICA Phytosanitary Certificate</div>
          <div style={{ color: '#444', fontSize: 11, marginBottom: 16 }}>PDF or image · Max 20 MB · Certificate number extracted automatically</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: MINT, color: '#000', borderRadius: 7, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>Choose File</span>
        </label>
      )}

      {(view === 'extracting' || view === 'saving') && (
        <div style={{ ...row, padding: '18px 20px', background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #90EE8222', borderTopColor: MINT, borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }}/>
          <div>
            <div style={{ color: '#888', fontSize: 13 }}>{view === 'extracting' ? 'Extracting certificate data…' : 'Uploading to Supabase Storage…'}</div>
            <div style={{ color: MINT, fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{pendingFile?.name}</div>
          </div>
        </div>
      )}

      {view === 'review' && ex && (
        <div style={card}>
          <div style={{ ...pad, ...div }}>
            <div style={{ color: MINT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Review — edit if needed</div>
            <input value={editNum} onChange={e => setEditNum(e.target.value)} placeholder="Certificate number"
              style={{ background: '#0a0a08', border: `1px solid #90EE8244`, borderRadius: 8, color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'Nunito, sans-serif', padding: '7px 12px', width: '100%', outline: 'none' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: '#444', fontSize: 11 }}>Verify the number before saving</span>
              <span style={{ color: MINT, fontSize: 11, fontWeight: 700 }}>Confidence: {ex.confidence ?? '—'}%</span>
            </div>
          </div>
          <div style={{ ...pad, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', ...div }}>
            <Field label="Exporter"        value={ex.exporter}/>
            <Field label="Consignee"       value={ex.consignee}/>
            <Field label="Lot / Container" value={[ex.lot_code, ex.container_code].filter(Boolean).join(' / ')} accent/>
            <Field label="Quantity"        value={ex.quantity_kg ? `${ex.quantity_kg} kg` : null}/>
            <Field label="Destination"     value={[ex.destination_country, ex.destination_port].filter(Boolean).join(' → ')}/>
            <Field label="Date of Issue"   value={[ex.date_of_issue, ex.place_of_issue].filter(Boolean).join(' · ')}/>
          </div>
          <div style={{ ...pad, ...div, display: 'flex', gap: 8 }}>
            <BtnPrimary onClick={handleSave} disabled={!editNum}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Confirm & Save
            </BtnPrimary>
            <BtnGhost onClick={() => { setPendingFile(null); setExtracted(null); setView('empty'); }}>Upload different file</BtnGhost>
          </div>
        </div>
      )}

      {view === 'saved' && (
        <div style={card}>
          <div style={{ ...pad, ...div, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ color: MINT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>ICA Phytosanitary Certificate</div>
              <div style={{ color: '#f0f0ea', fontSize: 20, fontWeight: 900, fontFamily: 'Nunito, sans-serif', letterSpacing: '-0.01em' }}>{d.phyto_cert_number || '—'}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, background: d.phyto_cert_verified ? '#90EE8218' : '#F5921E18', border: `1px solid ${d.phyto_cert_verified ? '#90EE8244' : '#F5921E44'}`, color: d.phyto_cert_verified ? MINT : ORANGE }}>
              {d.phyto_cert_verified ? '✓ Verified' : '⚠ Pending verification'}
            </span>
          </div>

          {d.phyto_cert_extracted_data && (
            <div style={{ ...pad, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', ...div }}>
              <Field label="Exporter"          value={d.phyto_cert_extracted_data.exporter}/>
              <Field label="Consignee"         value={d.phyto_cert_extracted_data.consignee}/>
              <Field label="Lot / Container"   value={[d.phyto_cert_extracted_data.lot_code, d.phyto_cert_extracted_data.container_code].filter(Boolean).join(' / ')} accent/>
              <Field label="Quantity"          value={d.phyto_cert_extracted_data.quantity_kg ? `${d.phyto_cert_extracted_data.quantity_kg} kg` : null}/>
              <Field label="Destination"       value={[d.phyto_cert_extracted_data.destination_country, d.phyto_cert_extracted_data.destination_port].filter(Boolean).join(' → ')}/>
              <Field label="Date of Issue"     value={[d.phyto_cert_extracted_data.date_of_issue, d.phyto_cert_extracted_data.place_of_issue].filter(Boolean).join(' · ')}/>
              <Field label="Authorized Officer" value={d.phyto_cert_extracted_data.authorized_officer}/>
              <Field label="Issuing Authority" value={d.phyto_cert_extracted_data.issuing_authority}/>
            </div>
          )}

          <div style={{ ...pad, ...div, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: MINT, color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                View PDF
              </a>
            )}
            <BtnGhost onClick={() => { setSignedUrl(null); setView('empty'); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M5 20h14"/></svg>
              Replace
            </BtnGhost>
            <BtnGhost onClick={handleVerify} disabled={verifying} danger={d.phyto_cert_verified}>
              {d.phyto_cert_verified ? 'Remove verification' : 'Mark as verified'}
            </BtnGhost>
            <span style={{ marginLeft: 'auto', color: '#333', fontSize: 11 }}>
              {d.phyto_cert_uploaded_at ? `Uploaded ${new Date(d.phyto_cert_uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
