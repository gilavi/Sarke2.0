import React, { useEffect } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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

interface NavChipProps {
  label: string;
  isActive: boolean;
  /** Resolved target border color for the pill. */
  borderColor: string;
  /** Resolved fill applied while active. */
  activeBg: string;
  labelColor: string;
  /** Resolved style for the status dot (color fill or mono ring). */
  dotStyle: StyleProp<ViewStyle>;
  /** Render the `done` checkmark instead of the dot. */
  showCheck: boolean;
  onPress: () => void;
  styles: ReturnType<typeof getStyles>;
  theme: Theme;
  a11yProps: object;
}

/**
 * One ChipNavStrip pill, extracted so each mapped chip owns its own animated
 * shared values. Adds the canonical press squish ({@link usePressBounce}), a 150ms
 * pill border/fill transition on selection, and a spring-in for the `done`
 * checkmark ({@link useSelectionPop}). The status dot fill stays instant. Honours
 * reduce-motion.
 */
export function NavChip({
  label, isActive, borderColor, activeBg, labelColor, dotStyle, showCheck, onPress, styles, theme, a11yProps,
}: NavChipProps) {
  const { scale, bounce } = usePressBounce(0.94);
  const { popStyle } = useSelectionPop(showCheck);
  const { reduceMotion } = useAccessibilitySettings();
  const border = useSharedValue(borderColor);
  const bg = useSharedValue(isActive ? activeBg : theme.colors.card);

  useEffect(() => {
    const bgT = isActive ? activeBg : theme.colors.card;
    if (reduceMotion) {
      border.value = borderColor;
      bg.value = bgT;
    } else {
      border.value = withTiming(borderColor, { duration: theme.motion.fast });
      bg.value = withTiming(bgT, { duration: theme.motion.fast });
    }
  }, [borderColor, activeBg, isActive, reduceMotion, theme, border, bg]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: border.value,
    backgroundColor: bg.value,
  }));

  return (
    <AnimatedPressable
      onPress={() => { bounce(); onPress(); }}
      style={[styles.tab, animStyle]}
      {...a11yProps}
    >
      {showCheck ? (
        <Animated.View style={[styles.check, popStyle]}>
          <Check size={13} color={theme.colors.ink} strokeWidth={1.5} />
        </Animated.View>
      ) : (
        <View style={[styles.dot, dotStyle]} />
      )}
      <Text style={[styles.label, isActive && { color: labelColor, fontWeight: '800' }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
