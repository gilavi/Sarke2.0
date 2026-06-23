// Briefings section of the project detail screen.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Hourglass, Megaphone, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { formatShortDateTime } from '../../../lib/formatDate';
import type { Briefing } from '../../../types/models';
import { getStyles } from '../styles';

export function BriefingsSection({
  id,
  briefings,
  loading = false,
}: {
  id: string | undefined;
  briefings: Briefing[];
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const sorted = useMemo(
    () => [...briefings].sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime)),
    [briefings],
  );
  const preview = useMemo(() => sorted.slice(0, 3), [sorted]);
  const overflow = useMemo(() => sorted.slice(3), [sorted]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Megaphone size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>ინსტრუქტაჟი</Text>
          <Text style={styles.sectionCount}>{briefings.length}</Text>
        </View>
        <Pressable onPress={() => id && router.push(`/briefings/new?projectId=${id}` as any)} hitSlop={16}>
          <Text style={styles.sectionAddLink}>+ დამატება</Text>
        </Pressable>
      </View>

      {loading && briefings.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : briefings.length === 0 ? (
        <SectionEmptyState type="briefings" />
      ) : (
        <View style={{ marginTop: 4 }}>
          {preview.map((b, i) => {
            const isCompleted = b.status === 'completed';
            const showBorder = i < preview.length - 1 || overflow.length > 0;
            return (
              <Pressable
                key={b.id}
                onPress={() => router.push(`/briefings/${b.id}` as any)}
                style={[styles.listRow, showBorder && styles.listRowBorder]}
                {...a11y('ინსტრუქტაჟი', 'დეტალების სანახავად დააჭირეთ', 'button')}
              >
                <View style={[styles.statusIcon, { backgroundColor: isCompleted ? theme.colors.semantic.successSoft : theme.colors.semantic.warningSoft }]}>
                  {isCompleted ? (
                    <ShieldCheck size={14} color={theme.colors.semantic.success} strokeWidth={1.5} />
                  ) : (
                    <Hourglass size={14} color={theme.colors.certTint} strokeWidth={1.5} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>
                    {formatShortDateTime(b.dateTime)}
                  </Text>
                  <Text style={styles.listRowSubtitle}>
                    {b.participants.length} მონაწილე · {isCompleted ? 'დასრულებული' : 'მიმდინარე'}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
              </Pressable>
            );
          })}
          {overflow.length > 0 ? (
            <ViewMoreRow
              items={overflow.map(() => ({ category: null }))}
              total={overflow.length}
              onPress={() => router.push(`/projects/${id}/briefings` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
