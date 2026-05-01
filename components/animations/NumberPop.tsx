import { useEffect, useRef } from 'react';
import { TextProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAccessibilitySettings } from '../../lib/accessibility';

interface Props extends Omit<TextProps, 'children'> {
  value: number | string;
}

export function NumberPop({ value, style, ...rest }: Props) {
  const scale = useSharedValue(1);
  const prev = useRef(value);
  const { reduceMotion } = useAccessibilitySettings();

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSequence(
        withTiming(1.15, { duration: 120 }),
        withSpring(1, { damping: 10, stiffness: 220, mass: 1 })
      );
    }
  }, [value, scale, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text {...rest} style={[style, animatedStyle]}>
      {value}
    </Animated.Text>
  );
}
