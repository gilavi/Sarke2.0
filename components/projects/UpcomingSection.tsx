import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useCalendarEvents } from '../../lib/apiHooks';
import { useTheme } from '../../lib/theme';
import { STATUS_DOT_COLOR } from '../../lib/statusColors';
import { useTranslation } from 'react-i18next';

interface UpcomingSectionProps {
  projectId: string | undefined;
}

export function UpcomingSection({ projectId }: UpcomingSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const events = useCalendarEvents();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const upcoming = useMemo(() => {
    if (!projectId) return [];
    return events
      .filter(e => !e.isPast && e.projectId === projectId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, [events, projectId]);

  if (upcoming.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function relativeLabel(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return t('calendar.dueToday', 'დღეს');
    if (diff > 0)   return t('calendar.inDays',   { count: diff,            defaultValue: `${diff} დღეში` });
    return           t('calendar.overdueDays',    { count: Math.abs(diff),  defaultValue: `${Math.abs(diff)} დღე გადაცილდა` });
  }

  return (
    <View style={[styles.sectionCard, { marginHorizontal: 16, marginTop: 12 }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.sectionTitle}>{t('calendar.upcomingSection')}</Text>
          <Text style={styles.sectionCount}>{upcoming.length}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
          hitSlop={16}
        >
          <Text style={styles.sectionAddLink}>{t('common.all', 'ყველა')}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        {upcoming.map(event => {
          const color    = STATUS_DOT_COLOR[event.status as keyof typeof STATUS_DOT_COLOR] ?? theme.colors.inkSoft;
          const iconName = event.type === 'inspection' ? 'shield-checkmark-outline' : 'people-outline';
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
              style={styles.listRow}
            >
              <View style={[styles.statusIcon, { backgroundColor: color + '20', width: 30, height: 30, borderRadius: 8 }]}>
                <Ionicons name={iconName as any} size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowTitle} numberOfLines={1}>{event.title}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color }}>
                {relativeLabel(event.date)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
    sectionCard:    { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16 },
    sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle:   { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    sectionCount:   { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
    sectionAddLink: { fontSize: 13, fontWeight: '600', color: theme.colors.accent },
    listRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12 },
    listRowTitle:   { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    statusIcon:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}
