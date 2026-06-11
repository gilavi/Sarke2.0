import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { useProject, useIncidentsByProject } from '../../../lib/apiHooks';
import { SkeletonRow } from '../../../components/Skeleton';
import { INCIDENT_TYPE_LABEL } from '../../../types/models';
import type { Incident, IncidentStatus, IncidentType } from '../../../types/models';

const INCIDENT_BADGE_COLORS_LIGHT: Record<
  IncidentType,
  { bg: string; text: string; border: string }
> = {
  minor:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  severe:   { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
  fatal:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  mass:     { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
};

const INCIDENT_BADGE_COLORS_DARK: Record<
  IncidentType,
  { bg: string; text: string; border: string }
> = {
  minor:    { bg: '#3F2E0F', text: '#FCD34D', border: '#F59E0B' },
  severe:   { bg: '#3D1F08', text: '#FCA673', border: '#F97316' },
  fatal:    { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
  mass:     { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
  nearmiss: { bg: '#2D1F4F', text: '#C4B5FD', border: '#8B5CF6' },
};

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
  const INCIDENT_BADGE_COLORS = isDark ? INCIDENT_BADGE_COLORS_DARK : INCIDENT_BADGE_COLORS_LIGHT;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const incidentsQ = useIncidentsByProject(id);
  const items = incidentsQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md): skeleton until the query
  // has produced a real answer; never flash empty state over a stale [].
  const loading = (incidentsQ.isFetching || !incidentsQ.isFetched) && items.length === 0;
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await incidentsQ.refetch(); } finally { setRefreshing(false); }
  }, [incidentsQ]);
  const [filter, setFilter] = useState<'all' | IncidentStatus>('all');

  const counts = useMemo(
    () => ({
      all: items.length,
      draft: items.filter(i => i.status === 'draft').length,
      completed: items.filter(i => i.status === 'completed').length,
    }),
    [items],
  );

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.status === filter)),
    [items, filter],
  );

  const grouped = useMemo(
    () => groupByDateDesc(filtered, inc => inc.date_time),
    [filtered],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: 'ინციდენტები' }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
      
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>ინციდენტები</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <FilterChip label={`ყველა · ${counts.all}`} active={filter === 'all'} onPress={() => setFilter('all')} theme={theme} />
          <FilterChip label={`დრაფტი · ${counts.draft}`} active={filter === 'draft'} onPress={() => setFilter('draft')} theme={theme} />
          <FilterChip label={`დასრულებული · ${counts.completed}`} active={filter === 'completed'} onPress={() => setFilter('completed')} theme={theme} />
        </View>

        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={theme.colors.borderStrong} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 10 }}>
                {group.items.map(inc => {
                  const badge = INCIDENT_BADGE_COLORS[inc.type] ?? INCIDENT_BADGE_COLORS.minor;
                  const isCompleted = inc.status === 'completed';
                  return (
                    <Pressable
                      key={inc.id}
                      onPress={() => router.push(`/incidents/${inc.id}` as any)}
                      style={styles.listRow}
                    >
                      <View
                        style={[
                          styles.statusIcon,
                          {
                            backgroundColor: isCompleted
                              ? theme.colors.semantic.successSoft
                              : theme.colors.semantic.warningSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isCompleted ? 'document-text' : 'hourglass-outline'}
                          size={14}
                          color={isCompleted ? theme.colors.semantic.success : theme.colors.certTint}
                        />
                      </View>
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
                          {inc.description || inc.location || '—'}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {formatShortDateTime(inc.date_time)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
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

function FilterChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: active ? theme.colors.accent : theme.colors.subtleSurface,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? theme.colors.white : theme.colors.inkSoft }}>
        {label}
      </Text>
    </Pressable>
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
