import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';

import { useAccessibilitySettings } from '../../lib/accessibility';

export function WizardProgress({ current, total }: { current: number; total: number }) {
  const { theme } = useTheme();
  const progress = current / total;
  const animatedWidth = useSharedValue(0);
  const { reduceMotion } = useAccessibilitySettings();

  useEffect(() => {
    if (reduceMotion) {
      animatedWidth.value = progress;
    } else {
      animatedWidth.value = withSpring(progress, theme.motion.spring.gentle);
    }
  }, [progress, reduceMotion, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View
      accessible
      accessibilityLabel={`პროგრესი: ${current} from ${total} კითხვა`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={{
        height: 4,
        backgroundColor: theme.colors.neutral[200],
        borderRadius: 2,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginTop: 8,
      }}
    >
      <Animated.View
        style={[
          { height: '100%', borderRadius: 2 },
          animatedStyle,
          {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          },
        ]}
      />
    </View>
  );
}
