import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text } from 'react-native';
import { Card, Badge, Button } from '@root/components/primitives';
import { useTheme } from '@root/lib/theme';
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
import { humanizeError } from '@/lib/errors';

export default function Qualifications() {
  const { theme } = useTheme();
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
      setError(humanizeError(e));
    } finally {
      setOpening(null);
    }
  }

  const displayError = error ?? (queryError ? humanizeError(queryError) : null);

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

      {displayError && <ErrorMessage>{displayError}</ErrorMessage>}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, flex: 1 }}>
                    {qualificationLabel(q.type)}
                  </Text>
                  {expired && <Badge variant="danger">ვადაგასული</Badge>}
                  {expiringSoon && <Badge variant="warning">იწურება</Badge>}
                </View>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text style={{ fontSize: 14, color: theme.colors.inkSoft }}>ნომერი: {q.number || '-'}</Text>
                  <Text style={{ fontSize: 14, color: theme.colors.inkSoft }}>
                    გაცემა: {q.issued_at ? new Date(q.issued_at).toLocaleDateString('ka-GE') : '-'}
                    {' · '}
                    ვადა: {q.expires_at ? new Date(q.expires_at).toLocaleDateString('ka-GE') : '-'}
                  </Text>
                </View>
                {q.file_url && (
                  <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
                    <Button
                      title={opening === q.id ? 'იხსნება…' : 'სერტიფიკატის ნახვა'}
                      variant="outline"
                      size="sm"
                      onPress={() => void openFile(q.file_url!, q.id)}
                      disabled={opening === q.id}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
