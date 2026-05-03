import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, withTiming } from 'react-native-reanimated';

const DURATION = 250;
const OFFSET = 30;
const easing = Easing.out(Easing.cubic);

const slideInRight = () => {
  'worklet';
  return {
    initialValues: {
      transform: [{ translateX: OFFSET }],
      opacity: 0,
    },
    animations: {
      transform: [{ translateX: withTiming(0, { duration: DURATION, easing }) }],
      opacity: withTiming(1, { duration: DURATION, easing }),
    },
  };
};

const slideOutLeft = () => {
  'worklet';
  return {
    initialValues: {
      transform: [{ translateX: 0 }],
      opacity: 1,
    },
    animations: {
      transform: [{ translateX: withTiming(-OFFSET, { duration: DURATION, easing }) }],
      opacity: withTiming(0, { duration: DURATION, easing }),
    },
  };
};

const slideInLeft = () => {
  'worklet';
  return {
    initialValues: {
      transform: [{ translateX: -OFFSET }],
      opacity: 0,
    },
    animations: {
      transform: [{ translateX: withTiming(0, { duration: DURATION, easing }) }],
      opacity: withTiming(1, { duration: DURATION, easing }),
    },
  };
};

const slideOutRight = () => {
  'worklet';
  return {
    initialValues: {
      transform: [{ translateX: 0 }],
      opacity: 1,
    },
    animations: {
      transform: [{ translateX: withTiming(OFFSET, { duration: DURATION, easing }) }],
      opacity: withTiming(0, { duration: DURATION, easing }),
    },
  };
};

interface Props {
  stepKey: string | number;
  direction: 'next' | 'prev';
  animate?: boolean;
  children: ReactNode;
}

export function WizardStepTransition({ stepKey, direction, animate = true, children }: Props) {
  const entering = animate ? (direction === 'prev' ? slideInLeft : slideInRight) : undefined;
  const exiting = animate ? (direction === 'prev' ? slideOutRight : slideOutLeft) : undefined;

  return (
    <View style={styles.wrap}>
      <Animated.View
        key={stepKey}
        entering={entering}
        exiting={exiting}
        style={styles.inner}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { ...StyleSheet.absoluteFillObject },
});
