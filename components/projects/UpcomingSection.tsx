import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, ShieldCheck, Users } from 'lucide-react-native';
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
      .slice(0, 1);
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
    <View style={[styles.sectionCard, { marginHorizontal: 20, marginTop: 12 }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Calendar size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{t('calendar.upcomingSection')}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
          hitSlop={16}
        >
          <Text style={styles.sectionAddLink}>{t('common.all', 'ყველა')}</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 4 }}>
        {upcoming.map((event, i) => {
          const color = STATUS_DOT_COLOR[event.status as keyof typeof STATUS_DOT_COLOR] ?? theme.colors.inkSoft;
          const EventIcon = event.type === 'inspection' ? ShieldCheck : Users;
          const showBorder = i < upcoming.length - 1;
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
              style={[styles.listRow, showBorder && styles.listRowBorder]}
            >
              <View style={[styles.statusIcon, { backgroundColor: color + '20', width: 30, height: 30, borderRadius: 8 }]}>
                <EventIcon size={16} color={color} strokeWidth={1.5} />
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
    // Flat section (no card box): content sits flush at the 20px gutter
    // supplied by the inline `marginHorizontal: 20`, matching the other sections.
    sectionCard:    {},
    sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle:   { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    sectionCount:   { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
    sectionAddLink: { fontSize: 13, fontWeight: '600', color: theme.colors.accent },
    listRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, backgroundColor: 'transparent' },
    listRowBorder:  { borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline },
    listRowTitle:   { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    statusIcon:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}
