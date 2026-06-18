import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';

/**
 * The canonical button press "feel" — a quick squish to `scaleTo` then a bouncy
 * spring back to 1, fired once per tap (respects reduce-motion).
 *
 * This is the SINGLE source for the press micro-interaction. Every tappable DS
 * control shares it (Button, IconButton, FabButton, StatusChip / answer buttons)
 * so the whole app clicks with the same motion. Originally lived inline in
 * StatusChip; extracted so it can't drift between controls.
 *
 * Usage:
 *   const { pressStyle, bounce } = usePressBounce();
 *   <Animated.View style={[pressStyle, ...]}><Pressable onPress={() => { bounce(); onPress(); }} /></Animated.View>
 *
 * `scale` is exposed for components that compose it with another transform
 * (e.g. StatusChip's error shake).
 */
export function usePressBounce(scaleTo = 0.94) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bounce = useCallback(() => {
    if (reduceMotion) return;
    scale.value = withSequence(
      withTiming(scaleTo, { duration: 80 }),
      withSpring(1, theme.motion.spring.bouncy),
    );
  }, [reduceMotion, scaleTo, theme, scale]);

  return { scale, pressStyle, bounce };
}
