// Calendar tab — month grid + daily due-inspection list.
// Drives a 10-day recurring schedule per project_item via schedulesApi.
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../components/BottomSheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import {
  questionnairesApi,
  schedulesApi,
  templatesApi,
} from '../../lib/services';
import { googleCalendar } from '../../lib/googleCalendar';
import { rescheduleAllFromDb } from '../../lib/notifications';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';

import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type { ScheduleWithItem, Template } from '../../types/models';

const WEEKDAY_LABELS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];
const MONTH_LABELS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/** Local "YYYY-MM-DD" key for bucketing schedules by day. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  // Monday = 0; JS getDay returns 0..6 (Sunday=0)
  const dow = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - dow);
  return c;
}

function endOfWeek(d: Date): Date {
  const c = startOfWeek(d);
  c.setDate(c.getDate() + 6);
  return endOfDay(c);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** 6×7 grid of Dates starting at Monday of the week containing the 1st. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const gridStart = startOfWeek(first);
  const cells: Date[] = [];
  const cur = new Date(gridStart);
  for (let i = 0; i < 42; i += 1) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

export default function CalendarScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showActionSheetWithOptions = useBottomSheet();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [schedules, setSchedules] = useState<ScheduleWithItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [ss, ts] = await Promise.all([
      schedulesApi.list().catch(() => [] as ScheduleWithItem[]),
      templatesApi.list().catch(() => [] as Template[]),
    ]);
    setSchedules(ss);
    setTemplates(ts);
    // Rebuild local reminders from the fresh list — best-effort.
    void rescheduleAllFromDb(ss);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleWithItem[]>();
    for (const s of schedules) {
      if (!s.next_due_at) continue;
      const key = dayKey(new Date(s.next_due_at));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [schedules]);

  const today = startOfDay(new Date());
  const todayKey = dayKey(today);
  const selectedKey = dayKey(selected);
  const grid = useMemo(
    () => buildMonthGrid(month.getFullYear(), month.getMonth()),
    [month],
  );

  // Summary counts
  const weekEnd = endOfWeek(today).getTime();
  const monthEnd = endOfMonth(today).getTime();
  let overdue = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  for (const s of schedules) {
    if (!s.next_due_at) continue;
    const t = new Date(s.next_due_at).getTime();
    if (t < today.getTime()) overdue += 1;
    if (t >= today.getTime() && t <= weekEnd) thisWeek += 1;
    if (t >= today.getTime() && t <= monthEnd) thisMonth += 1;
  }

  const daySchedules = byDay.get(selectedKey) ?? [];

  const prevMonth = () =>
    setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const jumpToday = () => {
    const n = new Date();
    setMonth(startOfMonth(n));
    setSelected(startOfDay(n));
  };

  const startInspection = (schedule: ScheduleWithItem) => {
    const system = templates.filter(t => t.is_system);
    if (system.length === 0) {
      toast.error('შაბლონი არ არის');
      return;
    }
    const projectId = schedule.project_items?.project_id;
    if (!projectId) {
      toast.error('პროექტი ვერ მოიძებნა');
      return;
    }
    const options = [...system.map(t => t.name), 'გაუქმება'];
    showActionSheetWithOptions(
      { title: 'აირჩიეთ შაბლონი', options, cancelButtonIndex: options.length - 1 },
      async idx => {
        if (idx == null || idx === options.length - 1) return;
        const tpl = system[idx];
        try {
          const q = await questionnairesApi.create({
            projectId,
            templateId: tpl.id,
            projectItemId: schedule.project_item_id,
          });
          router.push(`/inspections/${q.id}/wizard` as any);
        } catch (e) {
          toast.error(friendlyError(e, 'შექმნა ვერ მოხერხდა'));
        }
      },
    );
  };

  const syncGoogle = async () => {
    const connected = await googleCalendar.isConnected();
    if (!connected) {
      toast.info('ჯერ მიაერთეთ Google კალენდარი');
      router.push('/(tabs)/more' as any);
      return;
    }
    setSyncing(true);
    try {
      const count = await googleCalendar.pushAll(schedules);
      toast.success(`დაემატა: ${count}`);
    } catch (e) {
      toast.error(friendlyError(e, 'სინქრონიზაცია ვერ მოხერხდა'));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>კალენდარი</Text>
          <Pressable onPress={syncGoogle} hitSlop={8} style={styles.syncBtn} {...a11y('სინქრონიზაცია', 'Google კალენდართან სინქრონიზაცია', 'button')}>
            <Ionicons
              name={syncing ? 'sync' : 'cloud-upload-outline'}
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.syncBtnText}>სინქრონიზაცია</Text>
          </Pressable>
        </View>

        {/* Summary pills */}
        <View style={styles.summaryRow}>
          <SummaryPill
            label="ვადაგასული"
            value={overdue}
            tint={theme.colors.danger}
            bg={theme.colors.dangerSoft}
          />
          <SummaryPill
            label="ამ კვირას"
            value={thisWeek}
            tint={theme.colors.accent}
            bg={theme.colors.accentSoft}
          />
          <SummaryPill
            label="ამ თვეში"
            value={thisMonth}
            tint={theme.colors.harnessTint}
            bg={theme.colors.harnessSoft}
          />
        </View>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} hitSlop={10} style={styles.chevBtn} {...a11y('წინა თვე', 'წინა თვეზე გადასვლა', 'button')}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.monthLabel}>
              {MONTH_LABELS[month.getMonth()]} {month.getFullYear()}
            </Text>
          </View>
          <Pressable onPress={jumpToday} hitSlop={8} style={styles.todayBtn} {...a11y('დღეს', 'დღევანდელ თარიღზე გადასვლა', 'button')}>
            <Text style={styles.todayBtnText}>დღეს</Text>
          </Pressable>
          <Pressable onPress={nextMonth} hitSlop={10} style={styles.chevBtn} {...a11y('შემდეგი თვე', 'შემდეგ თვეზე გადასვლა', 'button')}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.ink} />
          </Pressable>
        </View>

        {/* Weekday labels */}
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map(l => (
            <View key={l} style={styles.weekCell}>
              <Text style={styles.weekText}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {grid.map(d => {
            const key = dayKey(d);
            const inMonth = d.getMonth() === month.getMonth();
            const items = byDay.get(key) ?? [];
            const count = items.length;
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isOverdue = count > 0 && d.getTime() < today.getTime();
            const tileStyle = [
              styles.dayTile,
              isSelected && styles.dayTileSelected,
              isOverdue && !isSelected && styles.dayTileOverdue,
              isToday && !isSelected && styles.dayTileToday,
            ];
            return (
              <Pressable
                key={key + (inMonth ? '' : '-o')}
                onPress={() => setSelected(startOfDay(d))}
                style={tileStyle}
                {...a11y(
                  `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
                  items.length > 0 ? `${items.length} შემოწმება` : undefined,
                  'button',
                )}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !inMonth && styles.dayNumMuted,
                    isSelected && styles.dayNumSelected,
                    isOverdue && !isSelected && styles.dayNumOverdue,
                  ]}
                >
                  {d.getDate()}
                </Text>
                {count > 0 ? (
                  <View
                    style={[
                      styles.dayBadge,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.white
                          : isOverdue
                            ? theme.colors.danger
                            : theme.colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayBadgeText,
                        {
                          color: isSelected
                            ? theme.colors.accent
                            : theme.colors.white,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Day list */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 10 }}>
          <Text style={styles.dayListTitle}>
            {selected.toLocaleDateString('ka-GE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          {!loaded && daySchedules.length === 0 ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={`skeleton-${i}`} padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Skeleton width={36} height={36} radius={18} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton width={'65%'} height={14} />
                      <Skeleton width={'40%'} height={11} />
                    </View>
                    <Skeleton width={72} height={30} radius={10} />
                  </View>
                </Card>
              ))}
            </>
          ) : daySchedules.length === 0 ? (
            <Card>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                შემოწმება არ არის ამ დღეს.
              </Text>
            </Card>
          ) : (
            daySchedules.map(s => {
              const projectName = s.project_items?.projects?.name ?? '—';
              const itemName = s.project_items?.name ?? '—';
              const isOverdue =
                s.next_due_at !== null &&
                new Date(s.next_due_at).getTime() < today.getTime();
              return (
                <Card key={s.id} padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={[
                        styles.itemDot,
                        {
                          backgroundColor: isOverdue
                            ? theme.colors.dangerSoft
                            : theme.colors.accentSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isOverdue ? 'alert-circle' : 'calendar'}
                        size={18}
                        color={isOverdue ? theme.colors.danger : theme.colors.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {itemName}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {projectName}
                      </Text>
                    </View>
                    <Pressable onPress={() => startInspection(s)} style={styles.startBtn} {...a11y('დაწყება', 'ინსპექციის დაწყება', 'button')}>
                      <Text style={styles.startBtnText}>დაწყება</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryPill({
  label,
  value,
  tint,
  bg,
}: {
  label: string;
  value: number;
  tint: string;
  bg: string;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

const TILE_SIZE = 44;

function getstyles(theme: any) {
  return StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.ink },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  pill: {
    flex: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 2,
  },
  pillValue: { fontSize: 22, fontWeight: '900' },
  pillLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 6,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.ink,
    textTransform: 'capitalize',
  },
  chevBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.subtleSurface,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.inkSoft,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    rowGap: 6,
  },
  dayTile: {
    width: `${100 / 7}%`,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayTileSelected: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
  },
  dayTileToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: 12,
  },
  dayTileOverdue: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 12,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  dayNumMuted: { color: theme.colors.inkFaint },
  dayNumSelected: { color: theme.colors.white },
  dayNumOverdue: { color: theme.colors.danger },
  dayBadge: {
    position: 'absolute',
    top: 2,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dayListTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  itemSub: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  startBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  startBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
}
