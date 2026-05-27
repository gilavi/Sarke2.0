import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  listQualifications,
  qualificationLabel,
  signedQualificationFileUrl,
  isExpired,
  isExpiringSoon,
} from '@/lib/data/qualifications';
import { SkeletonList } from '@/components/SkeletonCard';
import { qualificationKeys } from '@/app/queryKeys';
import { ErrorMessage } from '@/components/ui/error-message';

export default function Qualifications() {
  const { data: items, error: queryError, isLoading } = useQuery({
    queryKey: qualificationKeys.lists(),
    queryFn: listQualifications,
  });
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

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

  const displayError = error ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">
          კვალიფიკაციები
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          ინსპექტორის ლიცენზიები და ნებართვები.
        </p>
      </header>

      {displayError && (
        <ErrorMessage>{displayError}</ErrorMessage>
      )}
      {isLoading && <SkeletonList count={4} />}
      {items && items.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">სერტიფიკატები არ არის ატვირთული.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6">
          {items.map((q) => {
            const expired = isExpired(q.expires_at);
            const expiringSoon = !expired && isExpiringSoon(q.expires_at);
            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-heading-3 text-neutral-900 dark:text-neutral-100">
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
                <CardContent className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
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
