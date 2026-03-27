import { getLot, getExportDocs, getSignedUrl } from '../../../lib/supabase';
import LotDetail from '../../../components/LotDetail';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return { title: `Lot ${params.id} — Registro Provnr` };
}

export default async function LotPage({ params }) {
  let lot, exportDocs, phytoSignedUrl;

  try {
    lot = await getLot(params.id);
  } catch (e) {
    return (
      <div style={{ padding: 40, color: '#ff8080', fontFamily: 'monospace', background: '#060606', minHeight: '100vh' }}>
        <h2 style={{ marginBottom: 12 }}>getLot error</h2>
        <p>ID: {params.id}</p>
        <p>Message: {e.message}</p>
        <p>Code: {e.code}</p>
        <p>Details: {JSON.stringify(e.details)}</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div style={{ padding: 40, color: '#ff8080', fontFamily: 'monospace', background: '#060606', minHeight: '100vh' }}>
        <h2>Lot is null</h2>
        <p>ID: {params.id}</p>
      </div>
    );
  }

  try {
    exportDocs = await getExportDocs(params.id);
  } catch (e) {
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

  return <LotDetail lot={lot} exportDocs={docsWithUrls} phytoSignedUrl={phytoSignedUrl} />;
}
