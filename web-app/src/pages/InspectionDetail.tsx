import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getInspection,
  listInspectionPdfs,
  signedPdfUrl,
} from '@/lib/data/inspections';

export default function InspectionDetail() {
  const { id } = useParams();
  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const pdfsQ = useQuery({
    queryKey: ['inspectionPdfs', id],
    queryFn: () => listInspectionPdfs(id!),
    enabled: !!id,
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const inspection = inspectionQ.data ?? null;
  const pdfs = pdfsQ.data ?? [];
  const queryError = inspectionQ.error ?? pdfsQ.error;
  const error = actionError ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  async function openPdf(path: string, key: string) {
    try {
      setOpening(key);
      const url = await signedPdfUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  if (inspectionQ.isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!inspection) return <p className="text-sm text-neutral-500">აქტი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
          ← აქტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          {inspection.harness_name || `აქტი #${inspection.id.slice(0, 8)}`}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">სტატუსი: {inspection.status}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დასკვნა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>{inspection.conclusion_text || '—'}</div>
          <div>
            გამოყენებისთვის უსაფრთხო:{' '}
            {inspection.is_safe_for_use === null
              ? '—'
              : inspection.is_safe_for_use
                ? 'კი'
                : 'არა'}
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">PDF რეპორტები</h2>
        {pdfs.length === 0 ? (
          <p className="text-sm text-neutral-500">PDF ჯერ არ არის დამატებული.</p>
        ) : (
          <ul className="space-y-2">
            {pdfs.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <span className="text-sm text-neutral-700">
                  {new Date(p.generated_at).toLocaleString('ka-GE')}
                </span>
                <Button
                  type="button"
                  onClick={() => void openPdf(p.pdf_url, p.id)}
                  disabled={opening === p.id}
                >
                  {opening === p.id ? 'იხსნება…' : 'PDF-ის ნახვა'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
