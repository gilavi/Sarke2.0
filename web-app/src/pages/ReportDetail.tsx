import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoGallery from '@/components/PhotoGallery';
import {
  getReport,
  signedReportPdfUrl,
  signedReportPhotoUrl,
} from '@/lib/data/reports';

export default function ReportDetail() {
  const { id } = useParams();
  const { data: item, error: queryError, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: !!id,
  });
  const { data: imageUrls = {} } = useQuery({
    queryKey: ['reportPhotos', id, item?.slides],
    queryFn: async () => {
      const paths: string[] = [];
      for (const s of item?.slides ?? []) {
        const p = s.annotated_image_path || s.image_path;
        if (p) paths.push(p);
      }
      const entries = await Promise.all(
        paths.map((p) => signedReportPhotoUrl(p).then((u) => [p, u] as const).catch(() => [p, ''] as const)),
      );
      return Object.fromEntries(entries) as Record<string, string>;
    },
    enabled: !!item?.slides && item.slides.length > 0,
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const error = actionError ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  async function openPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedReportPdfUrl(item.pdf_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!item) return <p className="text-sm text-neutral-500">რეპორტი ვერ მოიძებნა.</p>;

  const slides = [...(item.slides ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <header>
        <Link to="/reports" className="text-sm text-brand-600 hover:underline">
          ← რეპორტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          {item.title || `რეპორტი #${item.id.slice(0, 8)}`}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">სტატუსი: {item.status}</p>
      </header>

      {item.pdf_url && (
        <Button type="button" onClick={() => void openPdf()} disabled={opening}>
          {opening ? 'იხსნება…' : 'PDF-ის ნახვა'}
        </Button>
      )}

      {slides.length === 0 ? (
        <p className="text-sm text-neutral-500">სლაიდები არ არის.</p>
      ) : (
        <>
          {/* slide metadata cards */}
          <div className="space-y-4">
            {slides.map((s, idx) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {s.title || 'სლაიდი'}
                  </CardTitle>
                </CardHeader>
                {s.description && (
                  <CardContent>
                    <p className="text-sm text-neutral-700">{s.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* unified photo gallery */}
          {(() => {
            const galleryUrls = slides.map((s) => {
              const path = s.annotated_image_path || s.image_path;
              return path ? (imageUrls[path] ?? '') : '';
            });
            const captions = slides.map((s, idx) => s.title || `სლაიდი ${idx + 1}`);
            const hasAny = galleryUrls.some(Boolean);
            return hasAny ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ფოტოები ({galleryUrls.filter(Boolean).length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoGallery urls={galleryUrls} captions={captions} />
                </CardContent>
              </Card>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}
