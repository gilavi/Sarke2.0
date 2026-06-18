import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings, a11y } from '../../lib/accessibility';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface StatusChipProps {
  selected: boolean;
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  /** 'pill' stacks the icon above the label (large yes/no); 'chip' is a compact inline row. */
  layout?: 'pill' | 'chip';
  disabled?: boolean;
  /**
   * Unselected + required: paints a danger outline and shakes once when it turns
   * on, so a failed-submit press flags this control as mandatory. Ignored while
   * `selected` (a chosen chip is never "in error").
   */
  error?: boolean;
  /**
   * When selected, paint the icon as a solid (filled) glyph instead of an
   * outline. Only meaningful for fillable icons (e.g. CircleCheck / CircleX);
   * line glyphs are unaffected. Used by the binary yes/no answer buttons.
   */
  fillSelectedIcon?: boolean;
  /** Overrides the accessible label (defaults to `label`). */
  a11yLabel?: string;
  a11yHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Monochrome, single-select control shared by every inspection answer surface
 * (binary yes/no, 3-state good/deficient/unusable, harness chips, verdict pills).
 * Selected = ink outline + subtle fill + ink content; unselected = hairline
 * outline + muted content. Severity is carried by `icon` + `label`, never color.
 *
 * Side effects: press-scale animation (skipped under reduce-motion). Haptics and
 * state changes are the caller's responsibility via `onPress`.
 */
export function StatusChip({
  selected,
  label,
  icon,
  onPress,
  layout = 'chip',
  disabled = false,
  error = false,
  fillSelectedIcon = false,
  a11yLabel,
  a11yHint,
  style,
}: StatusChipProps) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  const showError = error && !selected;

  // Shake once when the error turns on (skipped under reduce-motion).
  useEffect(() => {
    if (showError && !reduceMotion) {
      shake.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [showError, reduceMotion, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(0.94, { duration: 80 }),
        withSpring(1, theme.motion.spring.bouncy)
      );
    }
    onPress();
  };

  // Selected = solid ink fill with inverted (light) content; unselected = quiet
  // surface + muted content. The `inverse` palette flips correctly in dark mode
  // (light chip + dark content), so this stays legible in both themes.
  const contentColor = selected ? theme.colors.inverse.ink : theme.colors.inkSoft;
  const iconColor = selected ? theme.colors.inverse.ink : theme.colors.inkFaint;

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        layout === 'pill' ? styles.pill : styles.chip,
        {
          borderColor: selected
            ? theme.colors.inverse.background
            : showError
            ? theme.colors.danger
            : theme.colors.border,
          backgroundColor: selected ? theme.colors.inverse.background : theme.colors.surface,
        },
        disabled && { opacity: 0.4 },
        animatedStyle,
        style,
      ]}
      {...a11y(a11yLabel ?? label, a11yHint, 'button', { selected })}
    >
      {icon ? (() => {
        const Icon = icon;
        // Filled-selected: light circle (fill) with a dark mark (stroke) so the
        // glyph reads as solid against the dark selected background.
        const filled = fillSelectedIcon && selected;
        return (
          <Icon
            size={layout === 'pill' ? 20 : 18}
            color={filled ? theme.colors.inverse.background : iconColor}
            fill={filled ? theme.colors.inverse.ink : 'transparent'}
            strokeWidth={1.5}
            style={layout === 'pill' ? styles.pillIcon : undefined}
          />
        );
      })() : null}
      {label ? (
        <Text style={[layout === 'pill' ? styles.pillLabel : styles.chipLabel, { color: contentColor }]}>
          {label}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    pill: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderWidth: 1.5,
      borderRadius: theme.radius.lg,
      minHeight: 54,
    },
    chip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      minHeight: 44,
    },
    pillIcon: { marginBottom: 4 },
    pillLabel: { fontSize: 15, fontWeight: '700' },
    chipLabel: { fontSize: 14, fontWeight: '600' },
  });
}
