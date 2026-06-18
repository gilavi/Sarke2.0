// Reports section of the project detail screen.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { formatShortDateTime } from '../../../lib/formatDate';
import type { Report } from '../../../types/models';
import { getStyles } from '../styles';

export function ReportsSection({
  id,
  reports,
  loading = false,
}: {
  id: string | undefined;
  reports: Report[];
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const sorted = useMemo(
    () => [...reports].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [reports],
  );
  const preview = useMemo(() => sorted.slice(0, 3), [sorted]);
  const overflow = useMemo(() => sorted.slice(3), [sorted]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>რეპორტები</Text>
          <Text style={styles.sectionCount}>{reports.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/reports/new?projectId=${id}` as any)}
          hitSlop={16}
        >
          <Text style={styles.sectionAddLink}>+ ახალი რეპორტი</Text>
        </Pressable>
      </View>

      {loading && reports.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : reports.length === 0 ? (
        <SectionEmptyState type="reports" />
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {preview.map(r => {
            const isCompleted = r.status === 'completed';
            return (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push(
                    (isCompleted
                      ? `/reports/${r.id}`
                      : `/reports/${r.id}/edit`) as any,
                  )
                }
                style={styles.listRow}
                {...a11y('რეპორტი', 'დეტალების სანახავად დააჭირეთ', 'button')}
              >
                <View style={[styles.statusIcon, { backgroundColor: isCompleted ? theme.colors.semantic.successSoft : theme.colors.semantic.warningSoft }]}>
                  <FileText
                    size={14}
                    color={isCompleted ? theme.colors.semantic.success : theme.colors.certTint}
                    strokeWidth={1.5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.listRowSubtitle}>
                    {r.slides.length} სლაიდი · {formatShortDateTime(r.created_at)}
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
              onPress={() => router.push(`/projects/${id}/reports` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
