import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { RefreshControl } from '../../../components/primitives';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { SkeletonRow } from '../../../components/Skeleton';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';
import { listsLoadState } from '../../../hooks/useListLoadState';
import { inspectionDisplayName } from '../../../lib/shared/documentName';
import { routeForInspection } from '../../../lib/inspectionRouting';
import {
  useProject,
  useTemplates,
  useUnifiedInspectionsByProject,
} from '../../../lib/apiHooks';
import { InspectionListAvatar } from '../../../components/InspectionListAvatar';
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
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: project } = useProject(id);
  // One row per inspection across generic + all equipment types, via the
  // get_project_inspections_unified() RPC — the same source the project-detail
  // InspectionsSection preview reads, so this "view more" list can never drift
  // from it (the old 4-query merge missed 6 equipment types and duplicated the
  // 3 it did fetch via their parent `inspections` rows).
  const unifiedQ = useUnifiedInspectionsByProject(id);
  const templatesQ = useTemplates();
  const templates = templatesQ.data ?? [];
  // Canonical offline-aware guard (hooks/useListLoadState), unioned across the
  // source queries via listsLoadState below.
  const sourceQueries = [unifiedQ, templatesQ];

  // Completed-only — drafts live in the global Drafts screen (More tab).
  const items = useMemo(
    () => (unifiedQ.data ?? []).filter((x) => x.status === 'completed'),
    [unifiedQ.data],
  );

  const grouped = useMemo(() => groupByDateDesc(items, q => q.created_at), [items]);
  const loadState = listsLoadState(sourceQueries, items.length);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('records.inspections') }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl queries={[unifiedQ, templatesQ]} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('records.inspections')}</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        {loadState === 'skeleton' ? (
          <View style={{ gap: 10, paddingHorizontal: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : loadState === 'offline' ? (
          <OfflineEmptyState compact />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>{t('projects.noRecords')}</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              {group.items.map((item, i) => {
                const tpl = templates.find(t => t.id === item.template_id);
                const isLast = i === group.items.length - 1;
                // Canonical route dispatch — covers all equipment types plus
                // the generic/harness fallbacks (lib/inspectionRouting.ts).
                const route = routeForInspection(item.source, item.id, true);
                return (
                  <RecentListRow
                    key={item.id}
                    leading={<InspectionListAvatar category={item.source ?? tpl?.category ?? null} size={40} />}
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
