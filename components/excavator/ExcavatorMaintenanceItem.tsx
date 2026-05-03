import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { A11yText as Text } from '../primitives/A11yText';
import { DateTimeField } from '../DateTimeField';
import { useTheme, type Theme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import type { ExcavatorMaintenanceEntry, ExcavatorMaintenanceItemState } from '../../types/excavator';

const BRAND_GREEN      = '#10B981';
const BRAND_GREEN_SOFT = '#D1FAE5';

interface Props {
  index: number;
  entry: ExcavatorMaintenanceEntry;
  state: ExcavatorMaintenanceItemState;
  onChange: (patch: Partial<Pick<ExcavatorMaintenanceItemState, 'answer' | 'date'>>) => void;
}

export const ExcavatorMaintenanceItem = memo(function ExcavatorMaintenanceItem({
  index,
  entry,
  state,
  onChange,
}: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const setAnswer = (a: 'yes' | 'no') => {
    haptic.light();
    if (state.answer === a) {
      onChange({ answer: null, date: null });
    } else {
      onChange({ answer: a, date: a === 'no' ? null : state.date });
    }
  };

  const yesActive = state.answer === 'yes';
  const noActive  = state.answer === 'no';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
        <Text style={styles.label}>{entry.label}</Text>
        <View style={styles.toggles}>
          <Pressable
            style={[styles.toggle, yesActive && styles.toggleYesActive]}
            onPress={() => setAnswer('yes')}
            {...a11y('კი', undefined, 'button')}
          >
            <Ionicons
              name="checkmark"
              size={14}
              color={yesActive ? theme.colors.white : BRAND_GREEN}
            />
            <Text style={[styles.toggleText, yesActive && styles.toggleTextActive]}>კი</Text>
          </Pressable>

          <Pressable
            style={[styles.toggle, noActive && styles.toggleNoActive]}
            onPress={() => setAnswer('no')}
            {...a11y('არა', undefined, 'button')}
          >
            <Ionicons
              name="close"
              size={14}
              color={noActive ? theme.colors.white : theme.colors.danger}
            />
            <Text style={[styles.toggleText, noActive && styles.toggleTextActive]}>არა</Text>
          </Pressable>
        </View>
      </View>

      {yesActive && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(140)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={styles.dateRow}
        >
          <Text style={styles.dateLabel}>კონკრეტული თარიღი:</Text>
          <DateTimeField
            mode="date"
            value={state.date ? new Date(state.date) : new Date()}
            onChange={d => onChange({ date: d.toISOString().slice(0, 10) })}
          />
        </Animated.View>
      )}
    </View>
  );
});

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginBottom: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'flex-start',
      padding: 12, gap: 10,
    },
    numBadge: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    label: {
      flex: 1, fontSize: 12, color: theme.colors.ink, lineHeight: 17,
    },
    toggles: { flexDirection: 'row', gap: 6, marginTop: 1 },
    toggle: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 8, borderWidth: 1.5, borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    toggleYesActive: {
      backgroundColor: BRAND_GREEN,
      borderColor: BRAND_GREEN,
    },
    toggleNoActive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    toggleText:       { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    toggleTextActive: { color: theme.colors.white },
    dateRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 12, paddingBottom: 12,
      borderTopWidth: 1, borderTopColor: theme.colors.hairline,
      paddingTop: 10,
      backgroundColor: BRAND_GREEN_SOFT,
    },
    dateLabel: { fontSize: 12, color: BRAND_GREEN, fontWeight: '600', flex: 1 },
  });
}
