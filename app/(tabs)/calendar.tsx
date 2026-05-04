import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Skeleton } from '../../components/Skeleton';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import type { InspectionStatus } from '../../components/StatusBadge';
import { useTheme } from '../../lib/theme';
import { STATUS_DOT_COLOR } from '../../lib/statusColors';
import {
  useCalendarEvents,
  useAllInspections,
  useAllBriefings,
  useTemplates,
  qk,
} from '../../lib/apiHooks';
import {
  dotStatusesForDay,
  isSameDay,
} from '../../lib/calendarEvents';
import { runMigrationIfNeeded } from '../../lib/calendarSchedule';
import type { CalendarEvent } from '../../lib/calendarEvents';

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const monday = startOfDay(today);
  monday.setDate(today.getDate() - dow + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** How many full weeks offset is `date` from the current week's Monday. */
function weekOffsetForDate(date: Date): number {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const thisMonday = startOfDay(today);
  thisMonday.setDate(today.getDate() - dow);
  const targetDay = startOfDay(date);
  const diff = targetDay.getTime() - thisMonday.getTime();
  return Math.floor(diff / (7 * 86_400_000));
}

const WEEKDAY_SHORT = ['ორშ.', 'სამ.', 'ოთხ.', 'ხუთ.', 'პარ.', 'შაბ.', 'კვ.'];

const WEEKDAY_FULL = [
  'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი',
  'პარასკევი', 'შაბათი', 'კვირა',
];

const MONTH_FULL = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

const MONTH_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

function formatWeekLabel(weekDays: Date[]): string {
  const first = weekDays[0];
  const last = weekDays[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${MONTH_SHORT[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTH_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTH_SHORT[last.getMonth()]}`;
}

function formatDayLabel(date: Date): string {
  const dow = (date.getDay() + 6) % 7;
  return `${date.getDate()} ${MONTH_FULL[date.getMonth()]}, ${WEEKDAY_FULL[dow]}`;
}

function relativeDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return 'დღეს';
  if (diffDays > 0) return `${diffDays} დღეში`;
  return `${Math.abs(diffDays)} დღე გადაცილდა`;
}

// ── Section grouping ──────────────────────────────────────────────────────────

type DaySection = {
  dateKey: string;
  date: Date;
  label: string;
  overdue: CalendarEvent[];
  rest: CalendarEvent[];
};

function buildSections(events: CalendarEvent[]): DaySection[] {
  const map = new Map<string, DaySection>();
  for (const event of events) {
    const key = startOfDay(event.date).toDateString();
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        date: startOfDay(event.date),
        label: formatDayLabel(startOfDay(event.date)),
        overdue: [],
        rest: [],
      });
    }
    const sec = map.get(key)!;
    if (event.status === 'overdue') {
      sec.overdue.push(event);
    } else {
      sec.rest.push(event);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Returns the section whose date best matches the current scroll Y. */
function findVisibleSection(
  scrollY: number,
  offsets: Record<string, number>,
  sections: DaySection[],
): DaySection | null {
  let best: DaySection | null = null;
  for (const sec of sections) {
    const off = offsets[sec.dateKey];
    if (off === undefined) continue;
    if (off <= scrollY + 64) best = sec;
    else break;
  }
  return best;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const suppressScrollSync = useRef(false);
  const didInitialScroll = useRef(false);

  const { data: allInspections = [], isLoading: loadingInsp } = useAllInspections();
  const { data: allBriefings = [], isLoading: loadingBrief } = useAllBriefings();
  const { data: templates = [] } = useTemplates();
  const events = useCalendarEvents();
  const isLoading = loadingInsp || loadingBrief;

  const templateCategoryMap = useMemo(
    () => Object.fromEntries(templates.map(t => [t.id, t.category as string])),
    [templates],
  );

  useEffect(() => {
    if (allInspections.length === 0 && allBriefings.length === 0) return;
    void runMigrationIfNeeded(
      allInspections
        .filter(i => i.status === 'completed' && !!i.completed_at)
        .map(i => ({
          id: i.id,
          completed_at: i.completed_at!,
          project_id: i.project_id,
          template_id: i.template_id,
        })),
      allBriefings
        .filter(b => b.status === 'completed')
        .map(b => ({ id: b.id, dateTime: b.dateTime, projectId: b.projectId })),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInspections.length, allBriefings.length]);

  const today = startOfDay(new Date());
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(weekDays), [weekDays]);

  const headerMonth = useMemo(() => {
    const rep = weekDays[3];
    return `${MONTH_FULL[rep.getMonth()]} ${rep.getFullYear()}`;
  }, [weekDays]);

  const sections = useMemo(() => buildSections(events), [events]);

  // Scroll to today (or nearest future section) once sections + layout are ready
  useEffect(() => {
    if (sections.length === 0 || didInitialScroll.current) return;
    const todayKey = today.toDateString();
    const target =
      sections.find(s => s.dateKey >= todayKey) ?? sections[sections.length - 1];
    const tryScroll = () => {
      const off = sectionOffsets.current[target.dateKey];
      if (off !== undefined) {
        didInitialScroll.current = true;
        suppressScrollSync.current = true;
        scrollRef.current?.scrollTo({ y: off, animated: false });
        setTimeout(() => { suppressScrollSync.current = false; }, 300);
      } else {
        // Layout not yet measured — retry shortly
        setTimeout(tryScroll, 80);
      }
    };
    setTimeout(tryScroll, 100);
  // Only run when sections change in length (new data arrived)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  const swipeWeek = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .runOnJS(true)
        .onEnd(e => {
          if (Math.abs(e.translationX) > 50) {
            setWeekOffset(o => (e.translationX < 0 ? o + 1 : o - 1));
          }
        }),
    [],
  );

  const handleDayTap = useCallback(
    (day: Date) => {
      const d = startOfDay(day);
      setSelectedDay(d);
      const key = d.toDateString();
      const off = sectionOffsets.current[key];
      if (off !== undefined) {
        suppressScrollSync.current = true;
        scrollRef.current?.scrollTo({ y: off, animated: true });
        setTimeout(() => { suppressScrollSync.current = false; }, 600);
      }
    },
    [],
  );

  const handleScroll = useCallback(
    (y: number) => {
      if (suppressScrollSync.current) return;
      const visible = findVisibleSection(y, sectionOffsets.current, sections);
      if (!visible) return;
      if (!isSameDay(visible.date, selectedDay)) {
        setSelectedDay(visible.date);
        setWeekOffset(weekOffsetForDate(visible.date));
      }
    },
    [sections, selectedDay],
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>კალენდარი</Text>
        <Text style={styles.headerMonth}>{headerMonth}</Text>
      </View>

      {/* Week strip */}
      <GestureDetector gesture={swipeWeek}>
        <View style={styles.weekContainer}>
          <View style={styles.weekNavRow}>
            <Pressable
              onPress={() => setWeekOffset(o => o - 1)}
              hitSlop={8}
              style={styles.navArrow}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.inkSoft} />
            </Pressable>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <Pressable
              onPress={() => setWeekOffset(o => o + 1)}
              hitSlop={8}
              style={styles.navArrow}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.inkSoft} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dots = dotStatusesForDay(events, day);
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleDayTap(day)}
                  style={styles.dayCol}
                >
                  <Text style={[
                    styles.dayLetterLabel,
                    isSelected && styles.dayLetterSelected,
                  ]}>
                    {WEEKDAY_SHORT[idx]}
                  </Text>
                  <View style={[
                    styles.dayNumWrap,
                    isToday && styles.dayNumWrapToday,
                    isSelected && !isToday && styles.dayNumWrapSelected,
                  ]}>
                    <Text style={[
                      styles.dayNum,
                      isToday && styles.dayNumTodayText,
                      isSelected && !isToday && styles.dayNumSelected,
                    ]}>
                      {day.getDate()}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {dots.has('completed') && (
                      <View style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR.completed }]} />
                    )}
                    {dots.has('due_today') && (
                      <View style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR.due_today }]} />
                    )}
                    {dots.has('overdue') && (
                      <View style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR.overdue }]} />
                    )}
                    {dots.has('upcoming') && !dots.has('due_today') && !dots.has('overdue') && (
                      <View style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR.upcoming }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GestureDetector>

      {/* Event list */}
      {isLoading && sections.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={48} height={48} radius={10} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="38%" height={11} />
              </View>
            </View>
          ))}
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={30} color={theme.colors.inkFaint} />
          <Text style={styles.emptyText}>მოვლენები არ არის</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          onScroll={e => handleScroll(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {sections.map(section => (
            <View
              key={section.dateKey}
              onLayout={e => {
                sectionOffsets.current[section.dateKey] = e.nativeEvent.layout.y;
              }}
            >
              {/* Day section header */}
              <View style={[
                styles.sectionHeader,
                isSameDay(section.date, selectedDay) && styles.sectionHeaderActive,
              ]}>
                <Text style={[
                  styles.sectionHeaderText,
                  isSameDay(section.date, today) && styles.sectionHeaderToday,
                ]}>
                  {section.label}
                </Text>
                {isSameDay(section.date, today) && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>დღეს</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionEvents}>
                {section.overdue.length > 0 && (
                  <>
                    <View style={styles.overdueHeader}>
                      <Text style={styles.overdueHeaderText}>⚠ ვადაგადაცილებული</Text>
                    </View>
                    {section.overdue.map((event, idx) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        isLast={idx === section.overdue.length - 1 && section.rest.length === 0}
                        templateCategoryMap={templateCategoryMap}
                      />
                    ))}
                  </>
                )}
                {section.rest.map((event, idx) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isLast={idx === section.rest.length - 1}
                    templateCategoryMap={templateCategoryMap}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  isLast,
  templateCategoryMap,
}: {
  event: CalendarEvent;
  isLast: boolean;
  templateCategoryMap: Record<string, string>;
}) {
  const router = useRouter();

  const category = event.type === 'inspection'
    ? (templateCategoryMap[event.templateId ?? ''] ?? null)
    : null;

  const badgeStatus = useMemo((): InspectionStatus | null => {
    if (event.isPast || event.status === 'completed') return 'completed';
    if (event.status === 'overdue') return 'overdue';
    if (event.status === 'due_today') return 'due_today';
    if (event.status === 'upcoming') return 'due_soon';
    return null;
  }, [event]);

  const timeLabel = useMemo(() => {
    if (event.isPast) {
      const d = event.date;
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return relativeDayLabel(event.date);
  }, [event]);

  const handlePress = useCallback(() => {
    if (event.type === 'inspection') {
      router.push(`/inspections/${event.entityId}` as any);
    } else {
      router.push(`/briefings/${event.entityId}` as any);
    }
  }, [event, router]);

  return (
    <Pressable
      onPress={handlePress}
      style={[rowStyles.row, !isLast && rowStyles.rowBorder]}
    >
      <InspectionTypeAvatar
        category={category}
        size={48}
        status={badgeStatus}
        style={{ marginRight: 14, flexShrink: 0 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={rowStyles.meta} numberOfLines={1}>{event.projectName}</Text>
      </View>
      <Text style={rowStyles.time}>{timeLabel}</Text>
      <Ionicons name="chevron-forward" size={14} color="#D3D1C7" />
    </Pressable>
  );
}

// Matches home screen recentRow styles exactly
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  time: {
    fontSize: 12,
    color: '#B4B2A9',
    marginLeft: 8,
    marginRight: 4,
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────

function getStyles(theme: any) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.ink,
    },
    headerMonth: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.inkSoft,
    },
    // ── Week strip ──
    weekContainer: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      paddingBottom: 12,
    },
    weekNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 6,
      paddingBottom: 8,
    },
    navArrow: {
      padding: 6,
    },
    weekLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    weekRow: {
      flexDirection: 'row',
      paddingHorizontal: 6,
    },
    dayCol: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      paddingVertical: 2,
      minHeight: 72,
    },
    dayLetterLabel: {
      fontSize: 12,
      color: '#9CA3AF',
      fontWeight: '500',
    },
    dayLetterSelected: {
      color: '#1D9E75',
      fontWeight: '700',
    },
    dayNumWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumWrapToday: {
      backgroundColor: '#1D9E75',
    },
    // Selected (non-today): outlined ring
    dayNumWrapSelected: {
      borderWidth: 2,
      borderColor: '#1D9E75',
      backgroundColor: '#E8F5F0',
    },
    dayNum: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    dayNumTodayText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    dayNumSelected: {
      color: '#1D9E75',
      fontWeight: '700',
    },
    dotRow: {
      flexDirection: 'row',
      gap: 2,
      minHeight: 5,
      alignItems: 'center',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    // ── Skeletons / empty ──
    skeletonContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 20,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
    },
    // ── Section header ──
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 6,
    },
    sectionHeaderActive: {
      borderLeftWidth: 3,
      borderLeftColor: STATUS_DOT_COLOR.completed,
      paddingLeft: 12,
      marginLeft: 20,
      paddingHorizontal: 0,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionHeaderToday: {
      color: '#1D9E75',
    },
    todayPill: {
      backgroundColor: '#1D9E7520',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    todayPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1D9E75',
    },
    sectionEvents: {
      // rows handle their own paddingHorizontal to match home screen
    },
    // ── Overdue sub-header ──
    overdueHeader: {
      paddingTop: 2,
      paddingBottom: 4,
      paddingHorizontal: 24,
    },
    overdueHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#DC2626',
    },
  });
}
