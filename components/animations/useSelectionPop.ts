import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';

/**
 * Selection-confirm "pop" — the canonical motion for an indicator (radio dot,
 * checkbox inner, check icon) springing in when an option becomes selected. The
 * selection-state sibling of {@link usePressBounce}; like it, this is imported
 * directly (not re-exported from the animations barrel) and honours reduce-motion.
 *
 * Returns `popStyle`: scale + opacity spring 0 → 1 (bouncy) when `active` turns
 * true, and snap 1 → 0 (stiff) when it turns false. Under reduce-motion the value
 * jumps to its final state with no spring.
 *
 * The caller wraps the indicator in `Animated.View` + `popStyle`. Keep the marker
 * inside an already-sized container (e.g. a radio ring) and always-mounted so
 * `scale: 0` causes no layout twitch.
 *
 * @example
 *   const { popStyle } = useSelectionPop(active);
 *   <View style={styles.radio}><Animated.View style={[styles.radioDot, popStyle]} /></View>
 */
export function useSelectionPop(active: boolean) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
  const scale = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = active ? 1 : 0;
      return;
    }
    scale.value = active
      ? withSpring(1, theme.motion.spring.bouncy)
      : withSpring(0, theme.motion.spring.stiff);
  }, [active, reduceMotion, theme, scale]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return { scale, popStyle };
}
