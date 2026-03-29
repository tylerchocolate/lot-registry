'use client';
import { useState } from 'react';

const MINT   = '#90EE82';
const BORDER = '#1e1e1c';
const CARD   = '#0d0d0b';
const DIM    = '#888882';

// QR value — same format the cosecha app parses on first launch
// provnr://farmer/{uuid}
function qrValue(farmerId) {
  return `provnr://farmer/${farmerId}`;
}

// We use the free QR Server API to generate a clean PNG QR code.
// In production you could swap this for a self-hosted or react-qr-code component.
function qrImgUrl(value, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&margin=2`;
}

export default function FarmerQR({ farmer }) {
  const [copied, setCopied] = useState(false);
  const value = qrValue(farmer.id);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Agricultor — ${farmer.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; font-family: 'Nunito', sans-serif; }
            .card { border: 2px solid #000; border-radius: 12px; padding: 28px 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 300px; }
            .logo { font-size: 13px; font-weight: 900; color: #000; letter-spacing: 2px; text-transform: uppercase; }
            .name { font-size: 18px; font-weight: 900; color: #000; text-align: center; }
            .farm { font-size: 13px; color: #555; text-align: center; }
            img { border: 1px solid #eee; border-radius: 8px; }
            .id { font-family: monospace; font-size: 9px; color: #aaa; margin-top: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Provnr Cosecha</div>
            <img src="${qrImgUrl(value, 180)}" width="180" height="180" alt="QR" />
            <div class="name">${farmer.full_name}</div>
            ${farmer.farm_name ? `<div class="farm">${farmer.farm_name}</div>` : ''}
            <div class="id">${farmer.id}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

      {/* QR card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 280 }}>
        <img
          src={qrImgUrl(value, 200)}
          width={200}
          height={200}
          alt={`QR ${farmer.full_name}`}
          style={{ borderRadius: 8, border: '1px solid #eee' }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#000', fontFamily: 'Nunito, sans-serif', marginBottom: 4 }}>{farmer.full_name}</div>
          {farmer.farm_name && <div style={{ fontSize: 13, color: '#555' }}>{farmer.farm_name}</div>}
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, maxWidth: 380, width: '100%' }}>
        <p style={{ fontSize: 12, color: DIM, lineHeight: 1.7, margin: '0 0 12px' }}>
          Este código QR es la identificación del agricultor en Provnr Cosecha.
          El agricultor lo escanea en la primera apertura de la app y queda registrado en su teléfono.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0a0a08', borderRadius: 6, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
          <code style={{ flex: 1, fontSize: 10, color: MINT, wordBreak: 'break-all' }}>{value}</code>
          <button onClick={handleCopy}
            style={{ background: 'none', border: 'none', color: copied ? MINT : DIM, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 380 }}>
        <button onClick={handlePrint}
          style={{ flex: 1, background: MINT, border: 'none', borderRadius: 8, color: '#000', padding: '11px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir carnet
        </button>
        <button onClick={() => {
          const link = document.createElement('a');
          link.href = qrImgUrl(value, 400);
          link.download = `qr-${farmer.full_name.replace(/\s+/g, '-').toLowerCase()}.png`;
          link.click();
        }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, color: DIM, padding: '11px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          PNG
        </button>
      </div>
    </div>
  );
}
