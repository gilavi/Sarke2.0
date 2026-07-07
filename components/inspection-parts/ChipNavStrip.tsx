// Horizontal "secondary navigation" chip strip for inspection flows that step
// through repeated indexed sub-items (fall-protection devices, harnesses, …).
// Each chip shows a status dot + label and highlights the active item; tapping
// jumps to it. Originated as the fall-protection device tab strip, extracted so
// other flows can reuse the same look + behaviour.
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y, useAccessibilitySettings } from '../../lib/accessibility';
import { NavChip } from './NavChip';

export type ChipNavState = 'pending' | 'active' | 'done' | 'problem' | 'warning' | 'skipped';

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

/**
 * Monochrome marker used by `dotMode` 'mono'/'check'. Severity is conveyed by
 * fill/shape, never hue - matching the StatusChip answer language.
 *   done/active → solid ink dot   pending → hollow ring
 *   skipped     → muted hollow ring (inkFaint)
 */
function monoDot(state: ChipNavState, theme: Theme, isActive: boolean) {
  if (state === 'done' || state === 'active' || isActive) {
    return { backgroundColor: theme.colors.ink, borderWidth: 0 } as const;
  }
  if (state === 'skipped') {
    return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.inkFaint } as const;
  }
  return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.borderStrong } as const;
}

export interface ChipNavStripProps {
  items: ChipNavItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** 'status' (default) colors the active chip by state (accent / green / red).
   *  'neutral' keeps the active chip ink-gray and conveys state only via the
   *  small status dot - used where a colored selection competes with the UI. */
  tone?: 'status' | 'neutral';
  /** How the per-chip status marker is drawn.
   *  'color' (default) - colored `stateColor` dot (the original behaviour).
   *  'mono'  - ink/hollow dot, no hue (severity via fill/shape).
   *  'check' - checkmark for `done`, otherwise the mono dot.
   *  Use 'mono'/'check' in monochrome flows that must not show green. */
  dotMode?: 'color' | 'mono' | 'check';
}

export function ChipNavStrip({ items, activeIndex, onSelect, tone = 'status', dotMode = 'color' }: ChipNavStripProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const neutral = tone === 'neutral';

  // Keep the active chip scrolled into view so jumping to an off-screen item
  // visibly moves the strip - reinforcing that navigation happened rather than
  // leaving the user wondering whether anything changed.
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const widths = useRef<number[]>([]);
  const viewport = useRef(0);
  useEffect(() => {
    const x = offsets.current[activeIndex];
    const w = widths.current[activeIndex];
    if (x == null || w == null || viewport.current === 0) return;
    const target = Math.max(0, x + w / 2 - viewport.current / 2);
    scrollRef.current?.scrollTo({ x: target, animated: !reduceMotion });
  }, [activeIndex, reduceMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.wrap}
      onLayout={e => { viewport.current = e.nativeEvent.layout.width; }}
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
        // Status marker: colored dot (default) or a monochrome dot / checkmark.
        const showCheck = dotMode === 'check' && item.state === 'done';
        return (
          <NavChip
            key={item.key}
            label={item.label}
            isActive={isActive}
            borderColor={borderColor}
            activeBg={activeBg}
            labelColor={labelColor}
            // Color mode tweens the dot fill (status changes read as gradual);
            // mono/check pass a static ring/checkmark instead.
            dotColor={dotMode === 'color' ? dotColor : undefined}
            dotStyle={dotMode === 'color' ? undefined : monoDot(item.state, theme, isActive)}
            showCheck={showCheck}
            onPress={() => { haptic.light(); onSelect(idx); }}
            onLayout={e => {
              offsets.current[idx] = e.nativeEvent.layout.x;
              widths.current[idx] = e.nativeEvent.layout.width;
            }}
            styles={styles}
            theme={theme}
            a11yProps={a11y(item.label, item.a11yHint ?? item.label, 'tab')}
          />
        );
      })}
    </ScrollView>
  );
}

export function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
      maxHeight: 68,
    },
    strip: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      gap: 8,
      alignItems: 'center',
      paddingVertical: 10,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    dot: { width: 9, height: 9, borderRadius: 4.5 },
    check: { marginRight: -1 },
    label: { fontSize: 15, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
