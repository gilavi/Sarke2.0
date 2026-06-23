import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { RefreshControl } from '../../../components/primitives';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { useProject, useReportsByProject } from '../../../lib/apiHooks';
import { SkeletonRow } from '../../../components/Skeleton';
import type { Report } from '../../../types/models';

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

export default function ProjectReportsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const reportsQ = useReportsByProject(id);
  const items = reportsQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md): skeleton until the query
  // has produced a real answer; never flash empty state over a stale [].
  // Completed-only — drafts live in the global Drafts screen (More tab).
  const completed = useMemo(() => items.filter((r) => r.status === 'completed'), [items]);
  const loading = (reportsQ.isFetching || !reportsQ.isFetched) && completed.length === 0;
  const grouped = useMemo(() => groupByDateDesc(completed, (r) => r.created_at), [completed]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: 'რეპორტები' }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}

        refreshControl={<RefreshControl queries={[reportsQ]} />}
      >
        {project?.name ? <Text style={styles.pageSubtitle}>{project.name}</Text> : null}

        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : completed.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 10 }}>
                {group.items.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push(`/reports/${r.id}` as any)}
                    style={styles.listRow}
                  >
                    <View style={[styles.statusIcon, { backgroundColor: theme.colors.accentSoft }]}>
                      <FileText size={14} color={theme.colors.accent} strokeWidth={1.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.listRowSubtitle}>
                        {r.slides.length} სლაიდი · {formatShortDateTime(r.created_at)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function groupByDateDesc<T>(
  items: T[],
  getDate: (it: T) => string,
): { key: string; items: T[] }[] {
  const sorted = [...items].sort(
    (a, b) => +new Date(getDate(b)) - +new Date(getDate(a)),
  );
  const groups: { key: string; items: T[] }[] = [];
  for (const it of sorted) {
    const k = toDateKey(getDate(it));
    let g = groups.find(x => x.key === k);
    if (!g) {
      g = { key: k, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }
  return groups;
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    pageHeader: { marginBottom: 16 },
    pageTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.ink },
    pageSubtitle: { fontSize: 13, color: theme.colors.inkFaint, marginTop: 3 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    skeletonRow: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    emptyState: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyStateText: { fontSize: 14, color: theme.colors.inkFaint, fontWeight: '500' },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 14,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    listRowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    statusIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateSep: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 8,
      marginTop: 22,
    },
  });
}
