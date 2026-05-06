import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReport, signedReportPhotoUrl } from '@/lib/data/reports';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender, urlToDataUrl } from '@/lib/printable';

export default function ReportPrint() {
  const { id } = useParams();

  const reportQ = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: !!id,
  });

  const projectQ = useQuery({
    queryKey: ['project', reportQ.data?.project_id],
    queryFn: () => getProject(reportQ.data!.project_id),
    enabled: !!reportQ.data?.project_id,
  });

  const slidesSorted =
    [...(reportQ.data?.slides ?? [])].sort((a, b) => a.order - b.order);

  const photosQ = useQuery({
    queryKey: ['reportPhotosData', id, slidesSorted.length],
    queryFn: async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        slidesSorted.map(async (s) => {
          const path = s.annotated_image_path || s.image_path;
          if (!path) return;
          try {
            const url = await signedReportPhotoUrl(path);
            out[s.id] = await urlToDataUrl(url);
          } catch {
            // skip
          }
        }),
      );
      return out;
    },
    enabled: !!reportQ.data && slidesSorted.length > 0,
  });

  const ready =
    reportQ.isSuccess &&
    projectQ.isSuccess &&
    (slidesSorted.length === 0 || photosQ.isSuccess);

  useEffect(() => {
    if (ready) printAfterRender(700);
  }, [ready]);

  if (!reportQ.data) {
    return <p style={{ padding: 24 }}>{reportQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const r = reportQ.data;
  const p = projectQ.data;
  const photos = photosQ.data ?? {};

  return (
    <>
      <style>{A4_PRINT_STYLES}</style>
      <div className="print-toolbar no-print">
        <button onClick={() => window.history.back()}>დახურვა</button>
        <button className="primary" onClick={() => window.print()}>
          ბეჭდვა
        </button>
      </div>
      <div className="doc">
        <h1>{r.title || `რეპორტი #${r.id.slice(0, 8)}`}</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {p?.name ?? ''} · {new Date(r.created_at).toLocaleDateString('ka-GE')}
        </p>

        {slidesSorted.map((s, idx) => (
          <section key={s.id} style={{ pageBreakInside: 'avoid', marginTop: '12pt' }}>
            <h2>
              {idx + 1}. {s.title || 'სლაიდი'}
            </h2>
            {s.description && <p>{s.description}</p>}
            {photos[s.id] && (
              <img
                src={photos[s.id]}
                alt=""
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: 2,
                }}
              />
            )}
          </section>
        ))}

        {slidesSorted.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', marginTop: '24pt' }}>
            სლაიდები არ არის.
          </p>
        )}
      </div>
    </>
  );
}
