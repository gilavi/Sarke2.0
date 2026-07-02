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
import { useProject, useIncidentsByProject } from '../../../lib/apiHooks';
import { SkeletonRow } from '../../../components/Skeleton';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';
import { useListLoadState } from '../../../hooks/useListLoadState';
import { INCIDENT_TYPE_LABEL } from '../../../types/models';
import { incidentColors } from '../../../lib/statusColors';

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

export default function ProjectIncidentsList() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const INCIDENT_BADGE_COLORS = incidentColors(isDark);
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const incidentsQ = useIncidentsByProject(id);
  const items = incidentsQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md): skeleton until the query
  // has produced a real answer; never flash empty state over a stale [].
  // Completed-only — drafts live in the global Drafts screen (More tab).
  const completed = useMemo(() => items.filter((i) => i.status === 'completed'), [items]);
  const loadState = useListLoadState(incidentsQ, completed.length);
  const grouped = useMemo(() => groupByDateDesc(completed, (inc) => inc.date_time), [completed]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('records.incidents') }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}

        refreshControl={<RefreshControl queries={[incidentsQ]} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('records.incidents')}</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        {loadState === 'skeleton' ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : loadState === 'offline' ? (
          <OfflineEmptyState compact />
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
                {group.items.map(inc => {
                  const badge = INCIDENT_BADGE_COLORS[inc.type] ?? INCIDENT_BADGE_COLORS.minor;
                  return (
                    <Pressable
                      key={inc.id}
                      onPress={() => router.push(`/incidents/${inc.id}` as any)}
                      style={styles.listRow}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowTitleRow}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: badge.bg, borderColor: badge.border },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: badge.text }]}>
                              {INCIDENT_TYPE_LABEL[inc.type] ?? inc.type}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.listRowTitle} numberOfLines={1}>
                          {inc.description || inc.location || '-'}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {formatShortDateTime(inc.date_time)}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
                    </Pressable>
                  );
                })}
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
      marginBottom: 16,
    },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
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
    statusIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
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
    rowTitleRow: { flexDirection: 'row', marginBottom: 3 },
    listRowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    badge: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { fontSize: 10, fontWeight: '700' },
    dateSep: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 8,
      marginTop: 22,
    },
  });
}
