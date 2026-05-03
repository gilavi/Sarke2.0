import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../lib/theme';


const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHECK_PATH = 'M 26 51 L 44 68 L 74 38';
const CHECK_PATH_LENGTH = 80;

interface Props {
  size?: number;
  color?: string;
  glowColor?: string;
}

export function AnimatedSuccessIcon({
  size = 88,
  color: colorProp,
  glowColor,
}: Props) {
  const { theme } = useTheme();
  const color = colorProp ?? theme.colors.accent;
  const ringScale = useSharedValue(0);
  const checkOffset = useSharedValue(CHECK_PATH_LENGTH);
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 11, stiffness: 180, mass: 1 });
    checkOffset.value = withDelay(
      280,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) })
    );
    glowProgress.value = withDelay(
      720,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
        ),
        2,
        false
      )
    );
  }, [checkOffset, glowProgress, ringScale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringScale.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowProgress.value * 0.5,
    transform: [{ scale: 1 + glowProgress.value * 0.45 }],
  }));

  const checkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: checkOffset.value,
  }));

  const glowSize = size * 1.5;
  const glow = glowColor ?? color;

  return (
    <View style={[styles.wrap, { width: glowSize, height: glowSize }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: glow,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          },
          ringStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <AnimatedPath
            d={CHECK_PATH}
            stroke="#FFFFFF"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_PATH_LENGTH}
            animatedProps={checkAnimatedProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
  },
});
