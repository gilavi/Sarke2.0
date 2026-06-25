// SuccessCheckDisc — the black disc + white tick used by FlowSuccessScreen.
//
// Matches the success-screen reference: a black (ink) disc pops in, a white
// tick draws on, and a soft ink ripple expands once. Plays once on mount and
// fully respects `prefers-reduced-motion` — when reduce-motion is on it renders
// the final, static state (filled disc + drawn tick, no ripple) with no
// animation. This is a sibling to `components/animations/AnimatedSuccessIcon`
// (which is an accent-colored ring); the success screen wants a black disc, so
// the two intentionally differ rather than overloading one with a color prop.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../lib/theme';
import { useAccessibilitySettings } from '../../lib/accessibility';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TICK_PATH = 'M 26 51 L 44 68 L 74 38';
const TICK_LENGTH = 80;

interface Props {
  size?: number;
}

/** Animated black "done" disc with a white tick. Plays once on mount; static
 *  final state under reduce-motion. Sized by `size` (default 112). */
export function SuccessCheckDisc({ size = 112 }: Props) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();

  const discScale = useSharedValue(reduceMotion ? 1 : 0.5);
  const discOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const tickOffset = useSharedValue(reduceMotion ? 0 : TICK_LENGTH);
  const rippleScale = useSharedValue(0.85);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    discScale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 1 });
    discOpacity.value = withTiming(1, { duration: 180 });
    tickOffset.value = withDelay(
      250,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }),
    );
    rippleScale.value = withDelay(
      100,
      withTiming(1.8, { duration: 800, easing: Easing.out(Easing.quad) }),
    );
    rippleOpacity.value = withDelay(
      100,
      withSequence(
        withTiming(0.12, { duration: 80 }),
        withTiming(0, { duration: 720, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [reduceMotion, discScale, discOpacity, tickOffset, rippleScale, rippleOpacity]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: discScale.value }],
    opacity: discOpacity.value,
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tickOffset.value }));

  const tickSize = size * 0.5;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.ink },
          rippleStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.ink },
          discStyle,
        ]}
      >
        <Svg width={tickSize} height={tickSize} viewBox="0 0 100 100">
          <AnimatedPath
            d={TICK_PATH}
            stroke="#FFFFFF"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TICK_LENGTH}
            animatedProps={tickProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  disc: { alignItems: 'center', justifyContent: 'center' },
});
