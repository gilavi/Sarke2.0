import { useMemo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ChecklistLegendItem {
  icon?: IconName;
  shortLabel?: string;
  label: string;
}

/**
 * Quiet monochrome key for a {@link ChecklistItemRow} list — pairs each answer's
 * chip glyph (shown filled, as it looks when selected) with its Georgian label.
 * Stateless; severity is read from the icon/label, never color.
 */
export function ChecklistLegend({ items }: { items: ChecklistLegendItem[] }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.bar} accessibilityRole="summary">
      {items.map((it, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.tile}>
            {it.icon ? (
              <Ionicons name={it.icon} size={14} color={theme.colors.inverse.ink} />
            ) : (
              <Text style={styles.tileText}>{it.shortLabel}</Text>
            )}
          </View>
          <Text style={styles.label}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: theme.radius.md,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tile: {
      width: 22,
      height: 22,
      borderRadius: 7,
      backgroundColor: theme.colors.inverse.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: { fontSize: 9, fontWeight: '700', color: theme.colors.inverse.ink },
    label: { fontSize: 13, fontWeight: '500', color: theme.colors.inkSoft },
  });
}
