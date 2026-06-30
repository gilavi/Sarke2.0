import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CircleCheck } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { usePressBounce } from '../animations/usePressBounce';
import { useSelectionPop } from '../animations/useSelectionPop';
import { useAccessibilitySettings, a11y } from '../../lib/accessibility';
import { withOpacity, type Theme } from '../../lib/theme';
import type { SelectorOption } from './Selector';
import type { getSelectorStyles } from './Selector.styles';

type SelectorStyles = ReturnType<typeof getSelectorStyles>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CommonOptionProps {
  opt: SelectorOption;
  active: boolean;
  error?: boolean;
  isMulti: boolean;
  onPress: () => void;
  styles: SelectorStyles;
  theme: Theme;
  a11yRole: 'radio' | 'checkbox';
}

/**
 * One Selector option, extracted so each mapped option can own its own animated
 * shared values (rules-of-hooks forbids the hooks inside a `.map()`). Carries the
 * canonical press squish ({@link usePressBounce}), a 150ms border/background fill
 * on selection, and the indicator spring-in ({@link useSelectionPop}). Selection
 * state is prop-driven; all motion honours reduce-motion.
 */
export function SelectorOptionChip({
  opt, active, error, isMulti, onPress, styles, theme, a11yRole,
}: CommonOptionProps) {
  const { scale, bounce } = usePressBounce(0.94);
  const { reduceMotion } = useAccessibilitySettings();
  const bg = useSharedValue(active ? theme.colors.subtleSurface : theme.colors.card);
  const border = useSharedValue(
    error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline,
  );

  useEffect(() => {
    const bgT = active ? theme.colors.subtleSurface : theme.colors.card;
    const bdT = error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline;
    if (reduceMotion) {
      bg.value = bgT;
      border.value = bdT;
    } else {
      bg.value = withTiming(bgT, { duration: theme.motion.fast });
      border.value = withTiming(bdT, { duration: theme.motion.fast });
    }
  }, [active, error, reduceMotion, theme, bg, border]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bg.value,
    borderColor: border.value,
  }));

  return (
    <AnimatedPressable
      onPress={() => { bounce(); onPress(); }}
      disabled={opt.disabled}
      style={[styles.chip, opt.disabled && styles.disabled, animStyle]}
      {...a11y(opt.label ?? opt.value, undefined, a11yRole)}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {isMulti && active ? '✓ ' : ''}
        {opt.label ?? opt.value}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Grid Selector option — a big illustration card (label below) for the 2-column
 * type picker. Same motion contract as the chip/row; selection is carried by an
 * ink border plus a low-alpha ink fill (monochrome, so the card keeps its
 * surface and is only gently tinted, never blocked out by a solid grey).
 */
export function SelectorOptionCard({
  opt, active, error, onPress, styles, theme, a11yRole,
}: CommonOptionProps) {
  const { scale, bounce } = usePressBounce(0.97);
  const { reduceMotion } = useAccessibilitySettings();
  const fill = withOpacity(theme.colors.ink, 0.06);
  const bg = useSharedValue(active ? fill : 'transparent');
  const border = useSharedValue(
    error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline,
  );

  useEffect(() => {
    const bgT = active ? fill : 'transparent';
    const bdT = error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline;
    if (reduceMotion) {
      bg.value = bgT;
      border.value = bdT;
    } else {
      bg.value = withTiming(bgT, { duration: theme.motion.fast });
      border.value = withTiming(bdT, { duration: theme.motion.fast });
    }
  }, [active, error, reduceMotion, theme, bg, border, fill]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bg.value,
    borderColor: border.value,
  }));

  return (
    <AnimatedPressable
      onPress={() => { bounce(); onPress(); }}
      disabled={opt.disabled}
      style={[styles.card, opt.disabled && styles.disabled, animStyle]}
      {...a11y(opt.label ?? opt.value, opt.subtitle, a11yRole)}
    >
      <View style={styles.cardIlu}>{opt.leading}</View>
      <Text style={[styles.cardLabel, active && styles.cardLabelActive]} numberOfLines={2}>
        {opt.label ?? opt.value}
      </Text>
    </AnimatedPressable>
  );
}

interface RowOptionProps extends CommonOptionProps {
  isList: boolean;
  indicator: 'radio' | 'check';
}

/** Rows / list Selector option — same motion contract as {@link SelectorOptionChip}. */
export function SelectorOptionRow({
  opt, active, error, isMulti, isList, indicator, onPress, styles, theme, a11yRole,
}: RowOptionProps) {
  const Icon = opt.icon;
  const { scale, bounce } = usePressBounce(0.97);
  const { popStyle } = useSelectionPop(active);
  const { reduceMotion } = useAccessibilitySettings();
  const bg = useSharedValue(active ? theme.colors.subtleSurface : isList ? 'transparent' : theme.colors.card);
  const border = useSharedValue(
    error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline,
  );

  useEffect(() => {
    const bgT = active ? theme.colors.subtleSurface : isList ? 'transparent' : theme.colors.card;
    const bdT = error ? theme.colors.semantic.danger : active ? theme.colors.ink : theme.colors.hairline;
    if (reduceMotion) {
      bg.value = bgT;
      border.value = bdT;
    } else {
      bg.value = withTiming(bgT, { duration: theme.motion.fast });
      border.value = withTiming(bdT, { duration: theme.motion.fast });
    }
  }, [active, error, isList, reduceMotion, theme, bg, border]);

  const animStyle = useAnimatedStyle(() => {
    const base = { transform: [{ scale: scale.value }], backgroundColor: bg.value };
    return isList ? base : { ...base, borderColor: border.value };
  });

  return (
    <AnimatedPressable
      onPress={() => { bounce(); onPress(); }}
      disabled={opt.disabled}
      style={[
        isList ? styles.listRow : styles.row,
        isList && error && styles.listRowError,
        opt.disabled && styles.disabled,
        animStyle,
      ]}
      {...a11y(opt.label ?? opt.value, undefined, a11yRole)}
    >
      {opt.leading ?? (Icon ? <Icon size={20} color={active ? theme.colors.ink : theme.colors.inkSoft} strokeWidth={1.8} /> : null)}
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowText, active && styles.rowTextActive]}>{opt.label ?? opt.value}</Text>
        {opt.subtitle ? <Text style={styles.rowSubtitle}>{opt.subtitle}</Text> : null}
      </View>
      {indicator === 'check' ? (
        active ? (
          <Animated.View style={popStyle}>
            <CircleCheck size={22} color={theme.colors.ink} strokeWidth={1.5} />
          </Animated.View>
        ) : null
      ) : (
        <View style={[isMulti ? styles.checkbox : styles.radio, active && (isMulti ? styles.checkboxActive : styles.radioActive)]}>
          <Animated.View style={[isMulti ? styles.checkboxInner : styles.radioDot, popStyle]} />
        </View>
      )}
    </AnimatedPressable>
  );
}
