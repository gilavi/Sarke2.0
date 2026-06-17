import { StyleSheet, View } from 'react-native';
import { Check, Hourglass, CircleAlert, Clock } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { STATUS_BADGE_BG } from '../lib/statusColors';
import type { CalendarStatus } from '../lib/statusColors';

export type { CalendarStatus as InspectionStatus };

const STATUS_BADGE_LUCIDE_ICON: Record<CalendarStatus, LucideIcon> = {
  completed: Check,
  draft:     Hourglass,
  overdue:   CircleAlert,
  due_today: Clock,
  due_soon:  Clock,
  upcoming:  Clock,
};

export function StatusBadge({ status }: { status: CalendarStatus }) {
  const { theme } = useTheme();
  const bg = STATUS_BADGE_BG[status] ?? STATUS_BADGE_BG.draft;
  const IconComp = STATUS_BADGE_LUCIDE_ICON[status] ?? STATUS_BADGE_LUCIDE_ICON.draft;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: theme.colors.surface },
      ]}
    >
      <IconComp size={9} color={theme.colors.white} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
