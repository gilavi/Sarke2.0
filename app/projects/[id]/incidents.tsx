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
import { incidentsApi, projectsApi } from '../../../lib/services';
import { INCIDENT_TYPE_LABEL } from '../../../types/models';
import type { Incident, IncidentType, Project } from '../../../types/models';

type Period = 'week' | 'month' | '3months' | null;

const INCIDENT_BADGE_COLORS: Record<
  IncidentType,
  { bg: string; text: string; border: string }
> = {
  minor: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  severe: { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
  fatal: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  mass: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
};

const TYPE_LABELS: { label: string; value: IncidentType }[] = [
  { label: INCIDENT_TYPE_LABEL.minor, value: 'minor' },
  { label: INCIDENT_TYPE_LABEL.severe, value: 'severe' },
  { label: INCIDENT_TYPE_LABEL.fatal, value: 'fatal' },
  { label: INCIDENT_TYPE_LABEL.mass, value: 'mass' },
  { label: INCIDENT_TYPE_LABEL.nearmiss, value: 'nearmiss' },
];

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

export default function ProjectIncidentsList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showBottomSheet = useBottomSheet();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Incident[]>([]);
  const [typeFilter, setTypeFilter] = useState<IncidentType | null>(null);
  const [periodValue, setPeriodValue] = useState<Period>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p, list] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      incidentsApi.listByProject(id).catch(() => [] as Incident[]),
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

  const filtered = useMemo(() => {
    return items.filter(inc => {
      if (typeFilter && inc.type !== typeFilter) return false;
      if (!periodFilter(inc.date_time, periodValue)) return false;
      return true;
    });
  }, [items, typeFilter, periodValue]);

  const grouped = useMemo(
    () => groupByDateDesc(filtered, inc => inc.date_time),
    [filtered],
  );

  const clearFilters = () => {
    setTypeFilter(null);
    setPeriodValue(null);
  };

  const openTypeSheet = () => {
    const choices = TYPE_LABELS.map(t => t.label);
    const options = ['ყველა', ...choices, 'გაუქმება'];
    showBottomSheet(
      { title: 'ფილტრი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setTypeFilter(idx === 0 ? null : TYPE_LABELS[idx - 1].value);
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

  const typeChipLabel = typeFilter == null
    ? 'სახე ▾'
    : `● ${INCIDENT_TYPE_LABEL[typeFilter]}`;
  const periodChipLabel = periodValue == null
    ? 'პერიოდი ▾'
    : `● ${PERIOD_LABELS[PERIOD_VALUES.indexOf(periodValue)]}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: 'ინციდენტები',
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
            active={typeFilter != null}
            label={typeChipLabel}
            onPress={openTypeSheet}
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
                {group.items.map(inc => {
                  const badge = INCIDENT_BADGE_COLORS[inc.type] ?? INCIDENT_BADGE_COLORS.minor;
                  return (
                    <Pressable
                      key={inc.id}
                      onPress={() => router.push(`/incidents/${inc.id}` as any)}
                      style={styles.listRow}
                    >
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
                      <View style={{ flex: 1 }}>
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
    badge: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { fontSize: 10, fontWeight: '700' },
    dateSep: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      marginBottom: 4,
      marginTop: 12,
    },
  });
}
