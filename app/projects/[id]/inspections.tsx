import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { SkeletonRow } from '../../../components/Skeleton';
import { inspectionDisplayName } from '../../../lib/shared/documentName';
import {
  useProject,
  useInspectionsByProject,
  useTemplates,
  useBobcatInspectionsByProject,
  useExcavatorInspectionsByProject,
  useGeneralEquipmentInspectionsByProject,
} from '../../../lib/apiHooks';
import { InspectionTypeAvatar } from '../../../components/InspectionTypeAvatar';
import { RecentListRow } from '../../../components/RecentListRow';

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}

export default function ProjectInspectionsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  const genericQ = useInspectionsByProject(id);
  const bobcatQ = useBobcatInspectionsByProject(id);
  const excavatorQ = useExcavatorInspectionsByProject(id);
  const geQ = useGeneralEquipmentInspectionsByProject(id);
  const templatesQ = useTemplates();
  const genericItems = genericQ.data ?? [];
  const bobcatItems = bobcatQ.data ?? [];
  const excavatorItems = excavatorQ.data ?? [];
  const geItems = geQ.data ?? [];
  const templates = templatesQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md), unioned across the source
  // queries: skeleton while any source hasn't produced a real answer and the
  // merged list is still empty - never flash empty state over a stale [].
  const anyUnsettled = [genericQ, bobcatQ, excavatorQ, geQ, templatesQ].some(q => q.isFetching || !q.isFetched);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([genericQ.refetch(), bobcatQ.refetch(), excavatorQ.refetch(), geQ.refetch(), templatesQ.refetch()]);
    } finally { setRefreshing(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genericQ.refetch, bobcatQ.refetch, excavatorQ.refetch, geQ.refetch, templatesQ.refetch]);

  type UnifiedItem = {
    id: string;
    template_id: string;
    status: 'draft' | 'completed';
    created_at: string;
    source: 'generic' | 'bobcat' | 'excavator' | 'general_equipment';
  };

  const items = useMemo<UnifiedItem[]>(() => {
    const all: UnifiedItem[] = [
      ...genericItems.map(q => ({ id: q.id, template_id: q.template_id, status: q.status, created_at: q.created_at, source: 'generic' as const })),
      ...bobcatItems.map(b => ({ id: b.id, template_id: b.templateId ?? '', status: b.status, created_at: b.createdAt, source: 'bobcat' as const })),
      ...excavatorItems.map(e => ({ id: e.id, template_id: e.templateId ?? '', status: e.status, created_at: e.createdAt, source: 'excavator' as const })),
      ...geItems.map(g => ({ id: g.id, template_id: g.templateId ?? '', status: g.status, created_at: g.createdAt, source: 'general_equipment' as const })),
    ];
    return all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [genericItems, bobcatItems, excavatorItems, geItems]);

  const grouped = useMemo(() => groupByDateDesc(items, q => q.created_at), [items]);
  const loading = anyUnsettled && items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: 'შემოწმების აქტები' }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>შემოწმების აქტები</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={{ gap: 10, paddingHorizontal: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              {group.items.map((item, i) => {
                const tpl = templates.find(t => t.id === item.template_id);
                const isCompleted = item.status === 'completed';
                const isLast = i === group.items.length - 1;
                const route = (() => {
                  if (item.source === 'bobcat') return `/inspections/bobcat/${item.id}`;
                  if (item.source === 'excavator') return `/inspections/excavator/${item.id}`;
                  if (item.source === 'general_equipment') return `/inspections/general-equipment/${item.id}`;
                  return isCompleted ? `/inspections/${item.id}` : `/inspections/${item.id}/wizard`;
                })();
                const sourceKey = item.source === 'generic' ? (tpl?.category ?? null) : item.source;
                return (
                  <RecentListRow
                    key={`${item.source}-${item.id}`}
                    leading={
                      <InspectionTypeAvatar
                        category={sourceKey}
                        size={40}
                        status={isCompleted ? 'completed' : 'draft'}
                      />
                    }
                    title={inspectionDisplayName(tpl?.name)}
                    subtitle={formatShortDateTime(item.created_at)}
                    isLast={isLast}
                    onPress={() => router.push(route as any)}
                  />
                );
              })}
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
      paddingHorizontal: 24,
      paddingTop: 16,
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
    dateSep: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 4,
      marginTop: 22,
      paddingHorizontal: 24,
    },
  });
}
