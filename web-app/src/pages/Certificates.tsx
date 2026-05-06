import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  listCertificates,
  signedCertificatePdfUrl,
  type Certificate,
} from '@/lib/data/certificates';

export default function Certificates() {
  const [items, setItems] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    listCertificates()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">სერტიფიკატები</h1>
        <p className="mt-1 text-sm text-neutral-500">გენერირებული PDF სერტიფიკატები.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!items && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}

      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500">სერტიფიკატები ვერ მოიძებნა.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {c.conclusion_text?.slice(0, 60) || `სერტიფიკატი #${c.id.slice(0, 8)}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-neutral-600">
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
