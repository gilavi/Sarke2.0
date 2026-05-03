import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { useBottomSheet } from '../../components/BottomSheet';
import { useTheme } from '../../lib/theme';
import { useTranslation } from 'react-i18next';
import {
  useCalendarEvents,
  useAllInspections,
  useAllBriefings,
  useProjects,
  qk,
} from '../../lib/apiHooks';
import {
  eventsForDay,
  dotStatusesForDay,
  isSameDay,
} from '../../lib/calendarEvents';
import { runMigrationIfNeeded } from '../../lib/calendarSchedule';
import type { CalendarEvent, CalendarEventStatus } from '../../lib/calendarEvents';

// ── Date helpers (local) ─────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Returns the 7-day array for the week at Monday + weekOffset*7 days. */
function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = startOfDay(today);
  monday.setDate(today.getDate() - dow + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const WEEKDAY_SHORT = ['ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა', 'კვ'];

const MONTH_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

function formatMonthYear(d: Date): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function relativeDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 0) return 'დღეს';
  if (diffDays > 0) return `${diffDays} დღეში`;
  return `${Math.abs(diffDays)} დღე გადაცილდა`;
}

function relativeDayColor(event: CalendarEvent): string {
  if (event.status === 'overdue') return '#DC2626';
  if (event.status === 'due_today') return '#F59E0B';
  return '#9CA3AF';
}

type FilterType = 'all' | 'inspection' | 'briefing' | 'overdue' | 'upcoming';

// ── Main screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showSheet = useBottomSheet();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

  // Pre-filter by projectId deep-link param
  useEffect(() => {
    if (params.projectId) {
      setFilterProjectId(params.projectId);
    }
  }, [params.projectId]);

  const { data: allInspections = [], isLoading: loadingInsp } = useAllInspections();
  const { data: allBriefings = [], isLoading: loadingBrief } = useAllBriefings();
  const { data: projects = [] } = useProjects();
  const events = useCalendarEvents();
  const isLoading = loadingInsp || loadingBrief;

  // One-time migration — seeds schedule entries for all existing completions
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
  // Only re-run when the counts change (i.e. new completions came in)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInspections.length, allBriefings.length]);

  const today = startOfDay(new Date());
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()}–${last.getDate()} ${MONTH_SHORT[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTH_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTH_SHORT[last.getMonth()]}`;
  }, [weekDays]);

  const isCurrentWeek = weekOffset === 0;

  // Swipe gesture — follow wizard.tsx pattern
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

  const jumpToToday = useCallback(() => {
    setSelectedDay(startOfDay(new Date()));
    setWeekOffset(0);
  }, []);

  // Filtered events for the selected day
  const dayEvents = useMemo(() => {
    const base = eventsForDay(events, selectedDay);
    return base.filter(e => {
      if (filterType === 'inspection' && e.type !== 'inspection') return false;
      if (filterType === 'briefing' && e.type !== 'briefing') return false;
      if (filterType === 'overdue' && e.status !== 'overdue') return false;
      if (filterType === 'upcoming' && (e.isPast || e.status === 'overdue')) return false;
      if (filterProjectId && e.projectId !== filterProjectId) return false;
      return true;
    });
  }, [events, selectedDay, filterType, filterProjectId]);

  const hasAnyFilter = filterType !== 'all' || filterProjectId !== null;

  const openProjectFilter = useCallback(() => {
    const opts = [t('calendar.allProjects'), ...projects.map(p => p.name), t('common.cancel')];
    showSheet(
      { title: t('calendar.filterProject'), options: opts, cancelButtonIndex: opts.length - 1 },
      idx => {
        if (idx === undefined || idx === opts.length - 1) return;
        if (idx === 0) setFilterProjectId(null);
        else setFilterProjectId(projects[idx - 1].id);
      },
    );
  }, [projects, showSheet, t]);

  const selectedProjectName = filterProjectId
    ? (projects.find(p => p.id === filterProjectId)?.name ?? 'პროექტი')
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('calendar.title')}</Text>
        {(!isCurrentWeek || !isSameDay(selectedDay, today)) && (
          <Pressable onPress={jumpToToday} hitSlop={8} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>{t('calendar.jumpToToday')}</Text>
          </Pressable>
        )}
      </View>

      {/* Week strip */}
      <GestureDetector gesture={swipeWeek}>
        <View style={styles.weekStripContainer}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <View style={styles.weekRow}>
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dots = dotStatusesForDay(events, day);
              return (
                <Pressable
                  key={idx}
                  onPress={() => setSelectedDay(startOfDay(day))}
                  style={[
                    styles.dayCell,
                    isToday && !isSelected && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                >
                  <Text style={[styles.dayWeekday, isSelected && styles.dayTextSelected]}>
                    {WEEKDAY_SHORT[idx]}
                  </Text>
                  <Text style={[
                    styles.dayNum,
                    isToday && !isSelected && styles.dayNumToday,
                    isSelected && styles.dayTextSelected,
                  ]}>
                    {day.getDate()}
                  </Text>
                  <View style={styles.dotRow}>
                    {dots.has('completed') && <View style={[styles.dot, { backgroundColor: '#1D9E75' }]} />}
                    {dots.has('due_today') && <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />}
                    {dots.has('overdue') && <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />}
                    {dots.has('upcoming') && !dots.has('due_today') && !dots.has('overdue') && (
                      <View style={[styles.dot, { backgroundColor: '#9CA3AF' }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GestureDetector>

      {/* Chips + event list share the remaining space */}
      <View style={{ flex: 1 }}>
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexShrink: 0 }}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              ['all', t('calendar.filterAll')],
              ['inspection', t('calendar.filterInspection')],
              ['briefing', t('calendar.filterBriefing')],
              ['overdue', t('calendar.filterOverdue')],
              ['upcoming', t('calendar.filterUpcoming')],
            ] as Array<[FilterType, string]>
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilterType(key)}
              style={[styles.chip, filterType === key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filterType === key && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
          {/* Project filter chip */}
          <Pressable
            onPress={openProjectFilter}
            style={[styles.chip, filterProjectId !== null && styles.chipActive]}
          >
            <Text style={[styles.chipText, filterProjectId !== null && styles.chipTextActive]}>
              {selectedProjectName ? `${selectedProjectName} ▾` : `${t('calendar.filterProject')} ▾`}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Day header + event list */}
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>
              {`${selectedDay.getDate()} ${MONTH_SHORT[selectedDay.getMonth()]}, ${formatMonthYear(selectedDay).split(' ')[0].toLowerCase()}`}
            </Text>
          </View>

          {/* Event list */}
          <View style={styles.eventList}>
            {isLoading && dayEvents.length === 0 ? (
              [0, 1].map(i => (
                <Card key={`sk-${i}`} padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Skeleton width={36} height={36} radius={18} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton width="65%" height={14} />
                      <Skeleton width="40%" height={11} />
                    </View>
                  </View>
                </Card>
              ))
            ) : dayEvents.length === 0 ? (
              <EmptyDayState hasFilter={hasAnyFilter} />
            ) : (
              dayEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyDayState({ hasFilter }: { hasFilter: boolean }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Card padding={20}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Ionicons name="calendar-outline" size={32} color={theme.colors.inkFaint} />
        <Text style={{ color: theme.colors.inkSoft, fontSize: 13, textAlign: 'center' }}>
          {hasFilter ? t('calendar.emptyFilter') : t('calendar.emptyDay')}
        </Text>
      </View>
    </Card>
  );
}

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    event.type === 'inspection' ? 'shield-checkmark-outline' : 'people-outline';

  const iconColor = useMemo(() => {
    if (event.isPast) {
      return event.type === 'inspection' ? '#1D9E75' : '#4F46E5';
    }
    if (event.status === 'overdue') return '#DC2626';
    if (event.status === 'due_today') return '#F59E0B';
    return '#9CA3AF';
  }, [event]);

  const iconBg = useMemo(() => {
    if (event.isPast) {
      return event.type === 'inspection' ? '#D1FAE5' : '#EEF2FF';
    }
    if (event.status === 'overdue') return '#FEE2E2';
    if (event.status === 'due_today') return '#FEF3C7';
    return '#F3F4F6';
  }, [event]);

  const handleCardPress = useCallback(() => {
    if (event.type === 'inspection') {
      router.push(`/inspections/${event.entityId}` as any);
    } else {
      router.push(`/briefings/${event.entityId}` as any);
    }
  }, [event, router]);

  const handleGoToSite = useCallback(() => {
    router.push(`/projects/${event.projectId}` as any);
  }, [event.projectId, router]);

  const timeLabel = useMemo(() => {
    if (event.isPast) {
      const d = event.date;
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return relativeDayLabel(event.date);
  }, [event]);

  const timeLabelColor = event.isPast ? theme.colors.inkSoft : relativeDayColor(event);

  const statusLabel = useMemo((): string | null => {
    if (event.isPast) return null;
    if (event.status === 'due_today') return 'დღეს ვადა';
    if (event.status === 'overdue') return 'ვადა გადაცილდა';
    return 'დაგეგმილი';
  }, [event]);

  return (
    <Pressable onPress={handleCardPress} style={styles.eventCard}>
      {/* Icon */}
      <View style={[styles.eventIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>

      {/* Title + project */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventProject} numberOfLines={1}>{event.projectName}</Text>
        {statusLabel && (
          <Text style={[styles.eventStatusLabel, { color: iconColor }]}>{statusLabel}</Text>
        )}
      </View>

      {/* Time / due label */}
      <Text style={[styles.eventTime, { color: timeLabelColor }]}>{timeLabel}</Text>

      {/* "Go to site" button for future events */}
      {!event.isPast && (
        <Pressable onPress={handleGoToSite} style={styles.goToSiteBtn} hitSlop={4}>
          <Text style={styles.goToSiteBtnText}>{t('calendar.goToSite')}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: any) {
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
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.ink,
    },
    todayBtn: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
    },
    todayBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    weekStripContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
    },
    weekLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: 'center',
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: 12,
      gap: 2,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    dayCellSelected: {
      backgroundColor: theme.colors.accent,
    },
    dayWeekday: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
    },
    dayNum: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    dayNumToday: {
      color: theme.colors.accent,
    },
    dayTextSelected: {
      color: theme.colors.white,
    },
    dotRow: {
      flexDirection: 'row',
      gap: 2,
      minHeight: 6,
      alignItems: 'center',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.subtleSurface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    chipActive: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.accent,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    chipTextActive: {
      color: theme.colors.accent,
    },
    dayHeader: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    dayHeaderText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    eventList: {
      paddingHorizontal: 16,
      gap: 10,
    },
    eventCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    eventIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    eventProject: {
      fontSize: 12,
      color: theme.colors.inkSoft,
    },
    eventStatusLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    eventTime: {
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 0,
      marginTop: 2,
    },
    goToSiteBtn: {
      position: 'absolute',
      bottom: 10,
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
    },
    goToSiteBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.accent,
    },
  });
}
