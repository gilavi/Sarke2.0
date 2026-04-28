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
import { briefingsApi } from '../../../lib/briefingsApi';
import { projectsApi } from '../../../lib/services';
import type { Briefing, Project } from '../../../types/models';

type Period = 'week' | 'month' | '3months' | null;

const PERIOD_LABELS = ['ეს კვირა', 'ეს თვე', 'ბოლო 3 თვე'];
const PERIOD_VALUES: Period[] = ['week', 'month', '3months'];

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}
function periodFilter(dateStr: string, period: Period): boolean {
  if (!period) return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === 'week') {
    const w = new Date(now);
    w.setDate(now.getDate() - 7);
    return d >= w;
  }
  if (period === 'month') {
    const m = new Date(now);
    m.setMonth(now.getMonth() - 1);
    return d >= m;
  }
  if (period === '3months') {
    const m3 = new Date(now);
    m3.setMonth(now.getMonth() - 3);
    return d >= m3;
  }
  return true;
}
function topicLabel(t: string): string {
  return t.replace(/^custom:/, '');
}

export default function ProjectBriefingsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showBottomSheet = useBottomSheet();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Briefing[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [periodValue, setPeriodValue] = useState<Period>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p, list] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      briefingsApi.listByProject(id).catch(() => [] as Briefing[]),
    ]);
    setProject(p);
    setItems(list);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Unique topics across the loaded list (raw values, displayed without prefix)
  const topicsInList = useMemo(() => {
    const set = new Set<string>();
    for (const b of items) for (const t of b.topics) set.add(t);
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(b => {
      if (topicFilter && !b.topics.includes(topicFilter)) return false;
      if (!periodFilter(b.dateTime, periodValue)) return false;
      return true;
    });
  }, [items, topicFilter, periodValue]);

  const grouped = useMemo(() => groupByDateDesc(filtered, b => b.dateTime), [filtered]);

  const clearFilters = () => {
    setTopicFilter(null);
    setPeriodValue(null);
  };

  const openTopicSheet = () => {
    const choices = topicsInList;
    const display = choices.map(topicLabel);
    const options = ['ყველა', ...display, 'გაუქმება'];
    showBottomSheet(
      { title: 'ფილტრი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setTopicFilter(idx === 0 ? null : choices[idx - 1]);
      },
    );
  };

  const openPeriodSheet = () => {
    const options = ['ყველა', ...PERIOD_LABELS, 'გაუქმება'];
    showBottomSheet(
      { title: 'ფილტრი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setPeriodValue(idx === 0 ? null : PERIOD_VALUES[idx - 1]);
      },
    );
  };

  const topicChipLabel = topicFilter == null ? 'თემა ▾' : `● ${topicLabel(topicFilter)}`;
  const periodChipLabel = periodValue == null
    ? 'პერიოდი ▾'
    : `● ${PERIOD_LABELS[PERIOD_VALUES.indexOf(periodValue)]}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: 'ინსტრუქტაჟი',
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
            active={topicFilter != null}
            label={topicChipLabel}
            onPress={openTopicSheet}
          />
          <FilterChip
            active={periodValue != null}
            label={periodChipLabel}
            onPress={openPeriodSheet}
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
                {group.items.map(b => {
                  const isCompleted = b.status === 'completed';
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/briefings/${b.id}` as any)}
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
                          name={isCompleted ? 'shield-checkmark' : 'pencil'}
                          size={14}
                          color={isCompleted ? theme.colors.primary[700] : '#92400E'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle} numberOfLines={1}>
                          {b.topics.map(topicLabel).join(', ') || '—'}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {b.participants.length} მონაწილე · {formatShortDateTime(b.dateTime)}
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
    chipsRow: { paddingVertical: 4, paddingRight: 8 },
    centered: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
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
