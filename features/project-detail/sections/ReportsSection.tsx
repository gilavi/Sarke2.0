// Reports section of the project detail screen.
// Completed-only — drafts live in the global Drafts screen (More tab). Reports
// render as a full-bleed horizontal rail of cover-photo cards (`ReportCardRail`),
// not rows. The rail escapes the page gutter to scroll edge-to-edge, then rests
// its first/last card back at the 20px gutter so the cards line up flush with
// the section header and the flat list rows in the other sections.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { SkeletonRow } from '../../../components/Skeleton';
import { ReportCardRail } from '../../records';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
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

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>რეპორტები</Text>
          <Text style={styles.sectionCount}>{completed.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/reports/new?projectId=${id}` as any)}
          hitSlop={16}
          {...a11y('ახალი რეპორტი', 'ახალი რეპორტის შექმნა', 'button')}
        >
          <Text style={styles.sectionAddLink}>+ ახალი რეპორტი</Text>
        </Pressable>
      </View>

      {completed.length === 0 ? (
        <View>
          {loading ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <SectionEmptyState type="reports" />
          )}
        </View>
      ) : (
        <ReportCardRail
          reports={completed}
          onPressReport={(r) => router.push(`/reports/${r.id}` as any)}
          emptyText=""
          onViewAll={() => router.push(`/projects/${id}/reports` as any)}
          bleed={20}
          gutter={20}
        />
      )}
    </View>
  );
}
