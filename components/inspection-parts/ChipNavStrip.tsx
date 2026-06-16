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
  /** 'status' (default) colors the active chip by state (accent / green / red).
   *  'neutral' keeps the active chip ink-gray and conveys state only via the
   *  small status dot — used where a colored selection competes with the UI. */
  tone?: 'status' | 'neutral';
}

export function ChipNavStrip({ items, activeIndex, onSelect, tone = 'status' }: ChipNavStripProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const neutral = tone === 'neutral';
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
        // Dot always reflects real status; in neutral tone an active item never
        // tints the dot accent (raw state → a clean active chip stays gray).
        const dotColor = stateColor(neutral ? item.state : effective, theme);
        const borderColor = neutral
          ? isActive ? theme.colors.ink : theme.colors.border
          : stateColor(effective, theme);
        const activeBg = neutral ? theme.colors.subtleSurface : stateBg(effective, theme);
        const labelColor = neutral ? theme.colors.ink : stateColor(effective, theme);
        return (
          <Pressable
            key={item.key}
            style={[
              styles.tab,
              { borderColor },
              isActive && { backgroundColor: activeBg },
            ]}
            onPress={() => { haptic.light(); onSelect(idx); }}
            {...a11y(item.label, item.a11yHint ?? item.label, 'tab')}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.label, isActive && { color: labelColor, fontWeight: '800' }]}>
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
