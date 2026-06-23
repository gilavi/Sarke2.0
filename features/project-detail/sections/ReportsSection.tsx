// Reports section of the project detail screen.
// Completed-only — drafts live in the global Drafts screen (More tab) — and the
// rows carry no status chrome (shared `ReportRow`).

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { ReportRow } from '../../records';
import { useTheme } from '../../../lib/theme';
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

  const completed = useMemo(
    () =>
      reports
        .filter((r) => r.status === 'completed')
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [reports],
  );
  const preview = useMemo(() => completed.slice(0, 3), [completed]);
  const overflow = useMemo(() => completed.slice(3), [completed]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>რეპორტები</Text>
          <Text style={styles.sectionCount}>{completed.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/reports/new?projectId=${id}` as any)}
          hitSlop={16}
        >
          <Text style={styles.sectionAddLink}>+ ახალი რეპორტი</Text>
        </Pressable>
      </View>

      {loading && completed.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : completed.length === 0 ? (
        <SectionEmptyState type="reports" />
      ) : (
        <View style={{ marginTop: 4 }}>
          {preview.map((r, i) => (
            <ReportRow
              key={r.id}
              report={r}
              showBorder={i < preview.length - 1 || overflow.length > 0}
              onPress={() => router.push(`/reports/${r.id}` as any)}
            />
          ))}
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
