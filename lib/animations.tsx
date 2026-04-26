import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useStaggeredListAnimation<T>(data: T[], staggerDelay = 50) {
  return data.map((_, index) => ({
    entering: FadeInUp.delay(index * staggerDelay)
      .duration(300)
      .springify()
      .damping(20)
      .stiffness(200),
  }));
}

export function usePressAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      opacity.value = withTiming(0.9, { duration: 50 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      opacity.value = withTiming(1, { duration: 50 });
    });

  return { animatedStyle, gesture };
}

interface AnimatedScreenTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  delay?: number;
}

export function AnimatedScreenTransition({
  children,
  direction = 'right',
  delay = 0,
}: AnimatedScreenTransitionProps) {
  const translateX = useSharedValue(direction === 'right' ? 40 : -40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withSpring(0, { damping: 20, stiffness: 200 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
}
