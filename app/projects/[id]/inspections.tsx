import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import {
  useProject,
  useInspectionsByProject,
  useTemplates,
  useBobcatInspectionsByProject,
  useExcavatorInspectionsByProject,
  useGeneralEquipmentInspectionsByProject,
} from '../../../lib/apiHooks';
import { InspectionTypeAvatar } from '../../../components/InspectionTypeAvatar';
import type { Questionnaire } from '../../../types/models';

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
  const { data: genericItems = [], isLoading: genericLoading } = useInspectionsByProject(id);
  const { data: bobcatItems = [], isLoading: bobcatLoading } = useBobcatInspectionsByProject(id);
  const { data: excavatorItems = [], isLoading: excavatorLoading } = useExcavatorInspectionsByProject(id);
  const { data: geItems = [], isLoading: geLoading } = useGeneralEquipmentInspectionsByProject(id);
  const { data: templates = [], isLoading: tplsLoading } = useTemplates();
  const loading = genericLoading || bobcatLoading || excavatorLoading || geLoading || tplsLoading;

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: 'შემოწმების აქტები' }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>შემოწმების აქტები</Text>
          {project?.name ? (
            <Text style={styles.pageSubtitle}>{project.name}</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={theme.colors.borderStrong} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 10 }}>
                {group.items.map(item => {
                  const tpl = templates.find(t => t.id === item.template_id);
                  const isCompleted = item.status === 'completed';
                  const route = (() => {
                    if (item.source === 'bobcat') return `/inspections/bobcat/${item.id}`;
                    if (item.source === 'excavator') return `/inspections/excavator/${item.id}`;
                    if (item.source === 'general_equipment') return `/inspections/general-equipment/${item.id}`;
                    return isCompleted ? `/inspections/${item.id}` : `/inspections/${item.id}/wizard`;
                  })();
                  return (
                    <Pressable
                      key={`${item.source}-${item.id}`}
                      onPress={() => router.push(route as any)}
                      style={styles.listRow}
                    >
                      <InspectionTypeAvatar
                        category={tpl?.category}
                        size={40}
                        status={isCompleted ? 'completed' : 'draft'}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>{tpl?.name ?? 'შემოწმების აქტი'}</Text>
                        <Text style={styles.listRowSubtitle}>
                          {formatShortDateTime(item.created_at)}
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
    centered: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
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
