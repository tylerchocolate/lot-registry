import { notFound } from 'next/navigation';
import { getLot, getExportDocs, getSignedUrl } from '../../../lib/supabase';
import LotDetail from '../../../components/LotDetail';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  try {
    const lot = await getLot(params.id);
    return { title: `${lot.farm_name ?? params.id} — Registro Provnr` };
  } catch {
    return { title: 'Lot — Registro Provnr' };
  }
}

export default async function LotPage({ params }) {
  let lot, exportDocs, phytoSignedUrl;
  try {
    [lot, exportDocs] = await Promise.all([
      getLot(params.id),
      getExportDocs(params.id),
    ]);
  } catch {
    notFound();
  }

  if (lot.phyto_cert_storage_path) {
    phytoSignedUrl = await getSignedUrl(lot.phyto_cert_storage_path);
  }

  // Generate signed URLs for all export docs that have a storage path
  const docsWithUrls = await Promise.all(
    exportDocs.map(async doc => ({
      ...doc,
      signedUrl: doc.storage_path ? await getSignedUrl(doc.storage_path) : null,
    }))
  );

  return <LotDetail lot={lot} exportDocs={docsWithUrls} phytoSignedUrl={phytoSignedUrl} />;
}
