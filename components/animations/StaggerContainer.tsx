import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  staggerDelay = 50,
  initialDelay = 0,
}: StaggerContainerProps) {
  return (
    <View>
      {React.Children.map(children, (child, index) => (
        <Animated.View
          entering={FadeInUp.delay(initialDelay + index * staggerDelay).duration(220)}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}
