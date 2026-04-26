import React, { ReactNode } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';

interface PressableScaleProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  scaleTo?: number;
  hapticOnPress?: keyof typeof haptic;
  springConfig?: keyof typeof theme.motion.spring;
}

export function PressableScale({
  children,
  scaleTo = 0.96,
  hapticOnPress,
  springConfig = 'gentle',
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withTiming(scaleTo, { duration: 80 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, theme.motion.spring[springConfig]);
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (hapticOnPress && (haptic as any)[hapticOnPress]) {
      (haptic as any)[hapticOnPress]();
    }
    onPress?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
