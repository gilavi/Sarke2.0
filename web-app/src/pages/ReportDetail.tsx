import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getReport,
  signedReportPdfUrl,
  signedReportPhotoUrl,
  type Report,
} from '@/lib/data/reports';

export default function ReportDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReport(id)
      .then(setItem)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!item?.slides) return;
    const paths: string[] = [];
    for (const s of item.slides) {
      const p = s.annotated_image_path || s.image_path;
      if (p) paths.push(p);
    }
    Promise.all(
      paths.map((p) => signedReportPhotoUrl(p).then((u) => [p, u] as const).catch(() => [p, ''] as const)),
    ).then((entries) => {
      setImageUrls(Object.fromEntries(entries));
    });
  }, [item]);

  async function openPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedReportPdfUrl(item.pdf_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
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
        <div className="space-y-4">
          {slides.map((s, idx) => {
            const path = s.annotated_image_path || s.image_path;
            const url = path ? imageUrls[path] : null;
            return (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {s.title || 'სლაიდი'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={s.title || `Slide ${idx + 1}`}
                        className="w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}
                  {s.description && (
                    <p className="text-sm text-neutral-700">{s.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
