import { getLot, getExportDocs, getSignedUrl } from '../../../lib/supabase';
import LotDetail from '../../../components/LotDetail';
import AuthGuard from '../../../components/AuthGuard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return { title: `Lot ${params.id} — Registro Provnr` };
}

export default async function LotPage({ params }) {
  console.log('[lot page] fetching lot:', params.id);

  let lot, exportDocs, phytoSignedUrl;

  try {
    lot = await getLot(params.id);
    console.log('[lot page] lot result:', lot ? 'found' : 'null', lot?.id);
  } catch (e) {
    console.error('[lot page] getLot error:', e.message, e.code);
    return (
      <div style={{ padding: 40, color: '#ff8080', fontFamily: 'monospace' }}>
        <h2>Error loading lot</h2>
        <p>ID: {params.id}</p>
        <p>Error: {e.message}</p>
        <p>Code: {e.code}</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div style={{ padding: 40, color: '#ff8080', fontFamily: 'monospace' }}>
        <h2>Lot not found</h2>
        <p>ID: {params.id}</p>
      </div>
    );
  }

  try {
    exportDocs = await getExportDocs(params.id);
  } catch (e) {
    console.error('[lot page] getExportDocs error:', e.message);
    exportDocs = [];
  }

  if (lot.phyto_cert_storage_path) {
    phytoSignedUrl = await getSignedUrl(lot.phyto_cert_storage_path);
  }

  const docsWithUrls = await Promise.all(
    (exportDocs ?? []).map(async doc => ({
      ...doc,
      signedUrl: doc.storage_path ? await getSignedUrl(doc.storage_path) : null,
    }))
  );

  return (
    <AuthGuard>
      <LotDetail lot={lot} exportDocs={docsWithUrls} phytoSignedUrl={phytoSignedUrl} />
    </AuthGuard>
  );
}
