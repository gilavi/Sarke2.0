import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { getProject } from '@/lib/data/projects';
import { projectKeys, cargoPlatformKeys } from '@/app/queryKeys';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';
import { buildCargoPlatformPdfTemplate } from '@root/lib/cargoPlatformPdfTemplate';

export default function CargoPlatformPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const inspQ = useQuery({
    queryKey: cargoPlatformKeys.detail(id),
    queryFn: () => getCargoPlatformInspection(id!),
    enabled: !!id,
  });
  const projQ = useQuery({
    queryKey: projectKeys.detail(inspQ.data?.projectId),
    queryFn: () => getProject(inspQ.data!.projectId),
    enabled: !!inspQ.data?.projectId,
  });

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photosReady, setPhotosReady] = useState(false);

  useEffect(() => {
    if (!inspQ.data) return;
    const allPaths = [
      ...inspQ.data.items.flatMap(i => i.photo_paths ?? []),
      ...inspQ.data.summaryPhotos,
    ];
    if (!allPaths.length) { setPhotosReady(true); return; }
    Promise.all(allPaths.map(async p => [p, await signedInspectionPhotoUrl(p)] as [string, string]))
      .then(entries => {
        setPhotoUrls(Object.fromEntries(entries));
        setPhotosReady(true);
      })
      .catch(() => setPhotosReady(true));
  }, [inspQ.data]);

  if (!inspQ.data) {
    return <p style={{ padding: 24 }}>{inspQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  if (!projQ.isSuccess || !photosReady) {
    return <p style={{ padding: 24 }}>იტვირთება…</p>;
  }

  const html = buildCargoPlatformPdfTemplate({
    inspection: inspQ.data,
    projectName: projQ.data?.name,
    photoUrls,
  });

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
        title="ტვირთის მიმღები პლატფორმის შემოწმების აქტი"
        onLoad={() => { if (!isPreview) iframeRef.current?.contentWindow?.print(); }}
      />
    </>
  );
}
