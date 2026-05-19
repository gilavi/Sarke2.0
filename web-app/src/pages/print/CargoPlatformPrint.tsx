import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { getProject } from '@/lib/data/projects';
import { printAfterRender } from '@/lib/printable';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';
import { buildCargoPlatformPdfTemplate } from '@root/lib/cargoPlatformPdfTemplate';

export default function CargoPlatformPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const inspQ = useQuery({
    queryKey: ['cargoPlatformInspection', id],
    queryFn: () => getCargoPlatformInspection(id!),
    enabled: !!id,
  });
  const projQ = useQuery({
    queryKey: ['project', inspQ.data?.projectId],
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

  const ready = inspQ.isSuccess && projQ.isSuccess && photosReady;
  useEffect(() => {
    if (ready && !isPreview) printAfterRender(500);
  }, [ready, isPreview]);

  if (!inspQ.data) {
    return <p style={{ padding: 24 }}>{inspQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  if (!ready) {
    return <p style={{ padding: 24 }}>იტვირთება…</p>;
  }

  const html = buildCargoPlatformPdfTemplate({
    inspection: inspQ.data,
    projectName: projQ.data?.name,
    photoUrls,
  });

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
