import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { RefreshControl } from '../../../components/primitives';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { useProject, useBriefingsByProject } from '../../../lib/apiHooks';
import { SkeletonRow } from '../../../components/Skeleton';
import type { Briefing } from '../../../types/models';

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}
function topicLabel(t: string): string {
  return t.replace(/^custom:/, '');
}

export default function ProjectBriefingsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const briefingsQ = useBriefingsByProject(id);
  const items = briefingsQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md): skeleton until the query has
  // produced a real answer; never flash the empty state over a stale [].
  // Completed-only — drafts live in the global Drafts screen (More tab).
  const completed = useMemo(() => items.filter((b) => b.status === 'completed'), [items]);
  const loading = (briefingsQ.isFetching || !briefingsQ.isFetched) && completed.length === 0;
  const grouped = useMemo(() => groupByDateDesc(completed, (b) => b.dateTime), [completed]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('records.briefings') }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl queries={[briefingsQ]} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('records.briefings')}</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : completed.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>{t('projects.noRecords')}</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 10 }}>
                {group.items.map(b => (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push(`/briefings/${b.id}` as any)}
                    style={styles.listRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>
                        {b.topics.map(topicLabel).join(', ') || '-'}
                      </Text>
                      <Text style={styles.listRowSubtitle}>
                        {b.participants.length}{t('projects.participantCountSuffix')}{formatShortDateTime(b.dateTime)}
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
    pageHeader: {
      marginBottom: 24,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    pageSubtitle: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      marginTop: 3,
    },
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
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.inkFaint,
      fontWeight: '500',
    },
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
