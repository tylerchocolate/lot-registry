'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase';

const MINT = '#90EE82', ORANGE = '#F5921E', BORDER = '#1e1e1c';
const BUCKET = 'lot-documents';

const DOC_TYPES = [
  'Certificate of Origin',
  'Fumigation Certificate',
  'Export Declaration',
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading',
  'Warehouse Receipt',
  'Other',
];

function DocRow({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${doc.doc_type}"? This cannot be undone.`)) return;
    setDeleting(true);
    const db = createBrowserClient();
    if (doc.storage_path) await db.storage.from(BUCKET).remove([doc.storage_path]);
    await db.from('lot_export_docs').delete().eq('id', doc.id);
    onDelete(doc.id);
  }

  const statusColor = {
    Valid:    { color: MINT,    bg: '#90EE8218', border: '#90EE8244' },
    Pending:  { color: '#aaa',  bg: '#ffffff10', border: '#ffffff22' },
    Expired:  { color: '#FF5A5A', bg: '#FF5A5A18', border: '#FF5A5A44' },
  }[doc.status] ?? { color: '#aaa', bg: '#ffffff10', border: '#ffffff22' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${BORDER}`, gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0da', marginBottom: 2 }}>{doc.doc_type}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {doc.doc_number && <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>{doc.doc_number}</span>}
          {doc.issuer     && <span style={{ fontSize: 11, color: '#555' }}>{doc.issuer}</span>}
          {doc.issued_date && <span style={{ fontSize: 11, color: '#555' }}>{new Date(doc.issued_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ background: statusColor.bg, color: statusColor.color, border: `1px solid ${statusColor.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
          {doc.status}
        </span>
        {doc.signedUrl && (
          <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: MINT, color: '#000', borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View
          </a>
        )}
        <button onClick={handleDelete} disabled={deleting}
          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 7, color: '#ff8080', fontSize: 11, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

export default function ExportDocsPanel({ lotId, docs: initialDocs }) {
  const router = useRouter();
  const [docs,    setDocs]    = useState(initialDocs);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const [form, setForm] = useState({
    doc_type:    DOC_TYPES[0],
    doc_number:  '',
    issuer:      '',
    issued_date: '',
    expires_date:'',
    status:      'Pending',
    notes:       '',
    file:        null,
  });

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  async function handleAdd() {
    setSaving(true);
    setError(null);
    const db = createBrowserClient();

    let storagePath = null;
    if (form.file) {
      const ext  = form.file.name.split('.').pop();
      storagePath = `lots/${lotId}/docs/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(storagePath, form.file, { upsert: true, contentType: form.file.type || 'application/pdf' });
      if (upErr) { setError(upErr.message); setSaving(false); return; }
    }

    const { data, error: dbErr } = await db.from('lot_export_docs').insert({
      lot_id:       lotId,
      doc_type:     form.doc_type,
      doc_number:   form.doc_number  || null,
      issuer:       form.issuer      || null,
      issued_date:  form.issued_date || null,
      expires_date: form.expires_date|| null,
      status:       form.status,
      notes:        form.notes       || null,
      storage_path: storagePath,
    }).select().single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    // Get signed URL if file was uploaded
    let signedUrl = null;
    if (storagePath) {
      const { data: su } = await db.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
      signedUrl = su?.signedUrl ?? null;
    }

    setDocs(prev => [{ ...data, signedUrl }, ...prev]);
    setAdding(false);
    setSaving(false);
    setForm({ doc_type: DOC_TYPES[0], doc_number: '', issuer: '', issued_date: '', expires_date: '', status: 'Pending', notes: '', file: null });
    router.refresh();
  }

  const inputStyle = { width: '100%', padding: '8px 11px', background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 7, color: '#e8e8e2', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
        Other Export Documents
      </div>

      <div style={{ background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Existing docs */}
        <div style={{ padding: docs.length ? '0 20px' : '0' }}>
          {docs.length === 0 && !adding && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#333', fontSize: 13 }}>
              No documents uploaded yet
            </div>
          )}
          {docs.map(doc => (
            <DocRow key={doc.id} doc={doc} onDelete={id => setDocs(prev => prev.filter(d => d.id !== id))}/>
          ))}
        </div>

        {/* Add form */}
        {adding && (
          <div style={{ padding: '20px', borderTop: docs.length ? `1px solid ${BORDER}` : 'none', background: '#0d0d0b' }}>
            <div style={{ fontSize: 11, color: MINT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Add Document</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Document type</label>
                <select value={form.doc_type} onChange={e => set('doc_type')(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Document number</label>
                  <input style={inputStyle} value={form.doc_number} onChange={e => set('doc_number')(e.target.value)} placeholder="COO-BOG-2024-001"/>
                </div>
                <div>
                  <label style={labelStyle}>Issuer</label>
                  <input style={inputStyle} value={form.issuer} onChange={e => set('issuer')(e.target.value)} placeholder="ProColombia / DIAN"/>
                </div>
              </div>
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Issue date</label>
                  <input type="date" style={inputStyle} value={form.issued_date} onChange={e => set('issued_date')(e.target.value)}/>
                </div>
                <div>
                  <label style={labelStyle}>Expiry date</label>
                  <input type="date" style={inputStyle} value={form.expires_date} onChange={e => set('expires_date')(e.target.value)}/>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Pending', 'Valid', 'Expired'].map(s => (
                    <button key={s} onClick={() => set('status')(s)}
                      style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${form.status === s ? MINT : BORDER}`, background: form.status === s ? '#90EE8218' : 'transparent', color: form.status === s ? MINT : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>File (optional)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#111110', border: `1px solid ${BORDER}`, borderRadius: 7, cursor: 'pointer', position: 'relative' }}>
                  <input type="file" accept=".pdf,image/*" onChange={e => set('file')(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}/>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MINT} strokeWidth="2" strokeLinecap="round"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M5 20h14"/></svg>
                  <span style={{ fontSize: 12, color: form.file ? '#e0e0da' : '#555' }}>{form.file ? form.file.name : 'Choose PDF or image'}</span>
                </label>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#ff8080', fontSize: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleAdd} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: saving ? '#90EE8266' : MINT, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving && <div style={{ width: 12, height: 12, border: '2px solid #00000033', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>}
                {saving ? 'Saving…' : 'Save document'}
              </button>
              <button onClick={() => { setAdding(false); setError(null); }}
                style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!adding && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}` }}>
            <button onClick={() => setAdding(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = MINT; e.currentTarget.style.color = MINT; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#666'; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
