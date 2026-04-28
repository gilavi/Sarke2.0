import React, { useCallback } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

interface FabButtonProps {
  onPress: () => void;
  iconName?: string;
  iconRotation?: number;
  a11yLabel: string;
  a11yHint?: string;
  style?: StyleProp<ViewStyle>;
  viewRef?: React.RefObject<View>;
}

/**
 * Shared floating action button. 60×60 circle, accent background with green
 * glow shadow. Pass `iconRotation` (degrees) to animate the icon (e.g. 45 for
 * a × close state).
 */
export const FabButton = React.forwardRef<View, FabButtonProps>(function FabButton(
  { onPress, iconName = 'add', iconRotation = 0, a11yLabel, a11yHint, style },
  ref,
) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { stiffness: 300, damping: 10 }),
    );
  }, [scale]);

  return (
    <Pressable
      ref={ref as any}
      onPress={onPress}
      onPressIn={handlePressIn}
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 24,
          zIndex: 50,
        },
        style,
      ]}
      {...a11y(a11yLabel, a11yHint, 'button')}
    >
      <Animated.View
        style={[
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 10,
          },
          animatedStyle,
        ]}
      >
        <Ionicons
          name={iconName as any}
          size={28}
          color={theme.colors.white}
          style={iconRotation !== 0 ? { transform: [{ rotate: `${iconRotation}deg` }] } : undefined}
        />
      </Animated.View>
    </Pressable>
  );
});
