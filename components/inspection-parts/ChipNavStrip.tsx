// Horizontal "secondary navigation" chip strip for inspection flows that step
// through repeated indexed sub-items (fall-protection devices, harnesses, …).
// Each chip shows a status dot + label and highlights the active item; tapping
// jumps to it. Originated as the fall-protection device tab strip, extracted so
// other flows can reuse the same look + behaviour.
import { ScrollView, Pressable, View, StyleSheet } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export type ChipNavState = 'pending' | 'active' | 'done' | 'problem' | 'warning';

export interface ChipNavItem {
  key: string;
  label: string;
  state: ChipNavState;
  /** Optional accessibility hint (defaults to the label). */
  a11yHint?: string;
}

function stateColor(state: ChipNavState, theme: Theme): string {
  switch (state) {
    case 'done':    return theme.colors.semantic?.success ?? '#10B981';
    case 'problem': return theme.colors.danger;
    case 'warning': return theme.colors.warn;
    case 'active':  return theme.colors.accent;
    default:        return theme.colors.hairline;
  }
}

function stateBg(state: ChipNavState, theme: Theme): string {
  switch (state) {
    case 'done':    return (theme.colors.semantic as any)?.successSoft ?? '#D1FAE5';
    case 'problem': return theme.colors.dangerSoft ?? theme.colors.dangerTint;
    case 'warning': return theme.colors.warnSoft ?? '#FEF3C7';
    case 'active':  return theme.colors.accentSoft;
    default:        return theme.colors.subtleSurface;
  }
}

export interface ChipNavStripProps {
  items: ChipNavItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ChipNavStrip({ items, activeIndex, onSelect }: ChipNavStripProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.wrap}
    >
      {items.map((item, idx) => {
        const isActive = idx === activeIndex;
        // A neutral/pending item that is currently active reads as "active"
        // so the user can always see where they are.
        const effective: ChipNavState =
          isActive && item.state === 'pending' ? 'active' : item.state;
        const color = stateColor(effective, theme);
        return (
          <Pressable
            key={item.key}
            style={[
              styles.tab,
              { borderColor: color },
              isActive && { backgroundColor: stateBg(effective, theme) },
            ]}
            onPress={() => { haptic.light(); onSelect(idx); }}
            {...a11y(item.label, item.a11yHint ?? item.label, 'tab')}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.label, isActive && { color, fontWeight: '800' }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
      maxHeight: 52,
    },
    strip: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 6,
      alignItems: 'center',
      paddingVertical: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    dot: { width: 7, height: 7, borderRadius: 3.5 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
