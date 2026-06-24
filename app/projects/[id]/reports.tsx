import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { useProject, useReportsByProject } from '../../../lib/apiHooks';
import { ReportCardGrid, useReportDelete } from '../../../features/records';

export default function ProjectReportsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const confirmDelete = useReportDelete();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const reportsQ = useReportsByProject(id);
  const items = reportsQ.data ?? [];
  // Completed-only — drafts live in the global Drafts screen (More tab).
  const completed = useMemo(
    () =>
      items
        .filter((r) => r.status === 'completed')
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [items],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('records.reports') }} />
      <ReportCardGrid
        query={reportsQ}
        reports={completed}
        refreshQueries={[reportsQ]}
        emptyText={t('projects.noRecords')}
        onPressReport={(r) => router.push(`/reports/${r.id}` as any)}
        onDeleteReport={(r) => confirmDelete(r)}
        ListHeaderComponent={
          project?.name ? <Text style={styles.pageSubtitle}>{project.name}</Text> : null
        }
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    pageSubtitle: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      marginTop: 8,
      marginBottom: 4,
    },
  });
}
