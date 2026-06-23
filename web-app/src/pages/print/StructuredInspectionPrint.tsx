/**
 * ONE descriptor-driven print route for every structured act. Resolves the act
 * by category, fetches the row, signs its photo paths into a PhotoMap, and feeds
 * the shared `buildInspectionPdf` engine - replacing the per-type *Print.tsx
 * pages. Renders the resulting HTML in an iframe and auto-prints.
 *
 * Regulatory: the captured signature is read from in-memory router state
 * (`signaturesSession`), never from storage; on a direct nav / refresh it is
 * null and the PDF prints blank signer rows.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import { buildInspectionPdf } from '@/lib/inspection/pdf';
import type { PhotoMap } from '@/lib/inspection/schema';
import type { SignaturesSectionData } from '@/lib/inspection/renderSignaturesSection';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';
import { getStructuredAct } from '@/features/inspections/structured/acts';

export default function StructuredInspectionPrint({ actKey }: { actKey: string }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const location = useLocation();
  const signaturesSession =
    (location.state as { signaturesSession?: SignaturesSectionData } | null)?.signaturesSession ?? null;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const act = getStructuredAct(actKey);

  const inspQ = useQuery({
    queryKey: act ? act.descriptor.detailKey(id) : ['structured-print-missing', id],
    queryFn: () => act!.descriptor.get(id!),
    enabled: !!act && !!id,
  });
  const inspection = inspQ.data ?? null;
  const projectId = inspection && act ? act.descriptor.getProjectId(inspection) : null;
  const projQ = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  // Sign all photo paths into a PhotoMap (https URLs the iframe can load).
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [photosReady, setPhotosReady] = useState(false);
  useEffect(() => {
    if (!act || !inspection) return;
    // Promise.all([]) resolves on a microtask, so an empty path list still
    // settles via the async .then - no synchronous setState in the effect body.
    const paths = act.schema.collectPhotoPaths(inspection);
    let cancelled = false;
    Promise.all(
      paths.map(async (p) => {
        try { return [p, await signedInspectionPhotoUrl(p)] as const; }
        catch { return [p, ''] as const; }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const map: PhotoMap = {};
      for (const [p, u] of pairs) if (u) map[p] = u;
      setPhotos(map);
      setPhotosReady(true);
    });
    return () => { cancelled = true; };
  }, [act, inspection]);

  const ready = inspQ.isSuccess && (projQ.isSuccess || !projectId) && photosReady;

  if (!act) return <p style={{ padding: 24 }}>უცნობი შემოწმების ტიპი.</p>;
  if (inspQ.isLoading) return <p style={{ padding: 24 }}>იტვირთება…</p>;
  if (!inspection) return <p style={{ padding: 24 }}>აქტი ვერ მოიძებნა.</p>;
  if (!ready) return <p style={{ padding: 24 }}>იტვირთება…</p>;

  const html = buildInspectionPdf(
    act.schema,
    { inspection, projectName: projQ.data?.name ?? '', signaturesSession },
    photos,
  );

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, background: '#FAFAFA',
        borderBottom: '1px solid #E5E7EB', padding: '10px 16px',
        display: 'flex', gap: 8, justifyContent: 'flex-end', zIndex: 10,
      }}>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #D1D5DB', background: '#fff' }}
        >
          დახურვა
        </button>
        <button
          onClick={() => iframeRef.current?.contentWindow?.print()}
          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #2F855A', background: '#2F855A', color: '#fff' }}
        >
          ბეჭდვა
        </button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width: '100%', height: 'calc(100vh - 53px)', border: 'none', display: 'block' }}
        title={act.descriptor.title}
        onLoad={() => { if (!isPreview) iframeRef.current?.contentWindow?.print(); }}
      />
    </>
  );
}
