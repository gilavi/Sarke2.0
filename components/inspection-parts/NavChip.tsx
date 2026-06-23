import React, { useEffect } from 'react';
import { type LayoutChangeEvent, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { usePressBounce } from '../animations/usePressBounce';
import { useSelectionPop } from '../animations/useSelectionPop';
import { useAccessibilitySettings } from '../../lib/accessibility';
import type { Theme } from '../../lib/theme';
import type { getStyles } from './ChipNavStrip';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The active chip sits a touch larger than its idle siblings, so "where am I"
// is legible at a glance and switching chips shows a gentle grow/shrink.
const ACTIVE_SCALE = 1.06;

interface NavChipProps {
  label: string;
  isActive: boolean;
  /** Resolved target border color for the pill. */
  borderColor: string;
  /** Resolved fill applied while active. */
  activeBg: string;
  labelColor: string;
  /** Resolved target color for the status dot (color dotMode) - tweened. */
  dotColor?: string;
  /** Static style for the status dot when not color-coded (mono ring / skipped). */
  dotStyle?: StyleProp<ViewStyle>;
  /** Render the `done` checkmark instead of the dot. */
  showCheck: boolean;
  onPress: () => void;
  /** Forwarded so the strip can measure each chip for scroll-into-view. */
  onLayout?: (e: LayoutChangeEvent) => void;
  styles: ReturnType<typeof getStyles>;
  theme: Theme;
  a11yProps: object;
}

/**
 * One ChipNavStrip pill, extracted so each mapped chip owns its own animated
 * shared values. Adds the canonical press squish ({@link usePressBounce}), a 150ms
 * pill border/fill transition + a gentle active-scale spring on selection, a 250ms
 * status-dot color tween, and a spring-in for the `done` checkmark
 * ({@link useSelectionPop}). Honours reduce-motion.
 */
export function NavChip({
  label, isActive, borderColor, activeBg, labelColor, dotColor, dotStyle, showCheck, onPress, onLayout, styles, theme, a11yProps,
}: NavChipProps) {
  const { scale, bounce } = usePressBounce(0.94);
  const { popStyle } = useSelectionPop(showCheck);
  const { reduceMotion } = useAccessibilitySettings();
  const border = useSharedValue(borderColor);
  const bg = useSharedValue(isActive ? activeBg : theme.colors.card);
  const emphasis = useSharedValue(isActive ? ACTIVE_SCALE : 1);
  const dot = useSharedValue(dotColor ?? 'transparent');

  useEffect(() => {
    const bgT = isActive ? activeBg : theme.colors.card;
    const emphT = isActive ? ACTIVE_SCALE : 1;
    if (reduceMotion) {
      border.value = borderColor;
      bg.value = bgT;
      emphasis.value = emphT;
      if (dotColor) dot.value = dotColor;
    } else {
      border.value = withTiming(borderColor, { duration: theme.motion.fast });
      bg.value = withTiming(bgT, { duration: theme.motion.fast });
      emphasis.value = withSpring(emphT, theme.motion.spring.gentle);
      if (dotColor) dot.value = withTiming(dotColor, { duration: theme.motion.normal });
    }
  }, [borderColor, activeBg, isActive, dotColor, reduceMotion, theme, border, bg, emphasis, dot]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * emphasis.value }],
    borderColor: border.value,
    backgroundColor: bg.value,
  }));
  const dotAnim = useAnimatedStyle(() => ({ backgroundColor: dot.value }));

  return (
    <AnimatedPressable
      onPress={() => { bounce(); onPress(); }}
      onLayout={onLayout}
      style={[styles.tab, animStyle]}
      {...a11yProps}
    >
      {showCheck ? (
        <Animated.View style={[styles.check, popStyle]}>
          <Check size={15} color={theme.colors.ink} strokeWidth={1.5} />
        </Animated.View>
      ) : dotColor != null ? (
        <Animated.View style={[styles.dot, dotAnim]} />
      ) : (
        <View style={[styles.dot, dotStyle]} />
      )}
      <Text style={[styles.label, isActive && { color: labelColor, fontWeight: '800' }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
