import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listCertificates, signedCertificatePdfUrl } from '@/lib/data/certificates';
import { SkeletonList } from '@/components/SkeletonCard';

export default function Certificates() {
  const { data: items, error: queryError, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: listCertificates,
  });
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function openPdf(path: string, id: string) {
    try {
      setOpening(id);
      const url = await signedCertificatePdfUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  const displayError = error ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">სერტიფიკატები</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">გენერირებული PDF სერტიფიკატები.</p>
      </header>

      {displayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {isLoading && <SkeletonList count={4} />}

      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">სერტიფიკატები ვერ მოიძებნა.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6">
          {items.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-heading-3 text-neutral-900 dark:text-neutral-100">
                  {c.conclusion_text?.slice(0, 60) || `სერტიფიკატი #${c.id.slice(0, 8)}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
                <span>{new Date(c.generated_at).toLocaleString('ka-GE')}</span>
                <Button
                  type="button"
                  onClick={() => void openPdf(c.pdf_url, c.id)}
                  disabled={opening === c.id}
                >
                  {opening === c.id ? 'იხსნება…' : 'PDF-ის ნახვა'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
