import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  listQualifications,
  qualificationLabel,
  signedQualificationFileUrl,
  isExpired,
  isExpiringSoon,
  type Qualification,
} from '@/lib/data/qualifications';

export default function Qualifications() {
  const [items, setItems] = useState<Qualification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    listQualifications()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function openFile(path: string, id: string) {
    try {
      setOpening(id);
      const url = await signedQualificationFileUrl(path);
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
        <h1 className="font-display text-3xl font-bold text-neutral-900">
          ჩემი კვალიფიკაცია
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          პროფესიული სერტიფიკატები (ხარაჩოს / ღვედის ინსპექტორი).
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {!items && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500">სერტიფიკატები არ არის ატვირთული.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((q) => {
            const expired = isExpired(q.expires_at);
            const expiringSoon = !expired && isExpiringSoon(q.expires_at);
            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{qualificationLabel(q.type)}</span>
                    {expired && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-800">
                        ვადაგასული
                      </span>
                    )}
                    {expiringSoon && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-800">
                        იწურება
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-neutral-700">
                  <div>ნომერი: {q.number || '—'}</div>
                  <div>
                    გაცემა: {q.issued_at ? new Date(q.issued_at).toLocaleDateString('ka-GE') : '—'}
                    {' · '}
                    ვადა:{' '}
                    {q.expires_at
                      ? new Date(q.expires_at).toLocaleDateString('ka-GE')
                      : '—'}
                  </div>
                  {q.file_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void openFile(q.file_url!, q.id)}
                      disabled={opening === q.id}
                    >
                      {opening === q.id ? 'იხსნება…' : 'სერტიფიკატის ნახვა'}
                    </Button>
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
