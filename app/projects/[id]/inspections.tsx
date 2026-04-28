import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { useBottomSheet } from '../../../components/BottomSheet';
import { useTheme } from '../../../lib/theme';
import { formatShortDateTime } from '../../../lib/formatDate';
import { questionnairesApi, templatesApi, projectsApi } from '../../../lib/services';
import type { Project, Questionnaire, Template } from '../../../types/models';

type StatusFilter = 'completed' | 'draft' | null;

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
  const showBottomSheet = useBottomSheet();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [templateFilter, setTemplateFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p, q, tpls] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      questionnairesApi.listByProject(id).catch(() => [] as Questionnaire[]),
      templatesApi.list().catch(() => [] as Template[]),
    ]);
    setProject(p);
    setItems(q);
    setTemplates(tpls);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Available template names (limited to those that appear in this list)
  const templatesInList = useMemo(() => {
    const names = new Set<string>();
    for (const q of items) {
      const tpl = templates.find(t => t.id === q.template_id);
      if (tpl?.name) names.add(tpl.name);
    }
    return Array.from(names);
  }, [items, templates]);

  const filtered = useMemo(() => {
    return items.filter(q => {
      if (statusFilter && q.status !== statusFilter) return false;
      if (templateFilter) {
        const tpl = templates.find(t => t.id === q.template_id);
        if ((tpl?.name ?? '') !== templateFilter) return false;
      }
      return true;
    });
  }, [items, statusFilter, templateFilter, templates]);

  const grouped = useMemo(() => groupByDateDesc(filtered, q => q.created_at), [filtered]);

  const clearFilters = () => {
    setStatusFilter(null);
    setTemplateFilter(null);
  };

  const openStatusSheet = () => {
    const labels = ['დასრულებული', 'დრაფტი'];
    const values: StatusFilter[] = ['completed', 'draft'];
    const options = ['ყველა', ...labels, 'გაუქმება'];
    showBottomSheet(
      { title: 'ფილტრი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setStatusFilter(idx === 0 ? null : values[idx - 1]);
      },
    );
  };

  const openTemplateSheet = () => {
    const choices = templatesInList;
    const options = ['ყველა', ...choices, 'გაუქმება'];
    showBottomSheet(
      { title: 'ფილტრი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setTemplateFilter(idx === 0 ? null : choices[idx - 1]);
      },
    );
  };

  const statusChipLabel = statusFilter == null
    ? 'სტატუსი ▾'
    : `● ${statusFilter === 'completed' ? 'დასრულებული' : 'დრაფტი'}`;
  const templateChipLabel = templateFilter == null ? 'შაბლონი ▾' : `● ${templateFilter}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: 'ინსპექციები',
          headerBackTitle: 'უკან',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
      >
        {project?.name ? (
          <Text style={styles.projectSubtitle}>{project.name}</Text>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip
            active={statusFilter != null}
            label={statusChipLabel}
            onPress={openStatusSheet}
          />
          <FilterChip
            active={templateFilter != null}
            label={templateChipLabel}
            onPress={openTemplateSheet}
          />
        </ScrollView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={theme.colors.borderStrong} />
            <Text style={styles.emptyStateText}>ჩანაწერები არ არის</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="filter-outline" size={40} color={theme.colors.inkFaint} />
            <Text style={styles.emptyStateText}>ფილტრი არ ემთხვევა</Text>
            <Pressable onPress={clearFilters}>
              <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: '600' }}>
                გასუფთავება
              </Text>
            </Pressable>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 8 }}>
                {group.items.map(q => {
                  const tpl = templates.find(t => t.id === q.template_id);
                  const isCompleted = q.status === 'completed';
                  return (
                    <Pressable
                      key={q.id}
                      onPress={() =>
                        router.push(
                          (isCompleted
                            ? `/inspections/${q.id}`
                            : `/inspections/${q.id}/wizard`) as any,
                        )
                      }
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
                          name={isCompleted ? 'checkmark-circle' : 'pencil'}
                          size={14}
                          color={isCompleted ? theme.colors.primary[700] : '#92400E'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>{tpl?.name ?? 'ინსპექცია'}</Text>
                        <Text style={styles.listRowSubtitle}>
                          {formatShortDateTime(q.created_at)}
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

// ── Helpers shared across list screens ──

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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        marginRight: 8,
        backgroundColor: active ? theme.colors.semantic.successSoft : theme.colors.surface,
        borderColor: active ? theme.colors.primary[700] : theme.colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: active ? theme.colors.primary[700] : theme.colors.inkSoft,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    projectSubtitle: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      textAlign: 'center',
      marginBottom: 8,
    },
    chipsRow: {
      paddingVertical: 4,
      paddingRight: 8,
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
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    listRowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    statusIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateSep: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      marginBottom: 4,
      marginTop: 12,
    },
  });
}
