import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';
import { useAccessibilitySettings, a11y } from '../../lib/accessibility';

interface AnswerButtonsProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}

export function AnswerButtons({ value, onChange }: AnswerButtonsProps) {
  const yesScale = useSharedValue(1);
  const noScale = useSharedValue(1);
  const { reduceMotion } = useAccessibilitySettings();

  const handleYes = () => {
    if (!reduceMotion) {
      yesScale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1, theme.motion.spring.bouncy)
      );
    }
    haptic.answerYes();
    onChange(true);
  };

  const handleNo = () => {
    if (!reduceMotion) {
      noScale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1, theme.motion.spring.bouncy)
      );
    }
    haptic.answerNo();
    onChange(false);
  };

  const yesStyle = useAnimatedStyle(() => ({
    transform: [{ scale: yesScale.value }],
    backgroundColor: value === true ? theme.colors.semantic.success : theme.colors.surface,
    borderColor: value === true ? theme.colors.semantic.success : theme.colors.border,
  }));

  const noStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noScale.value }],
    backgroundColor: value === false ? theme.colors.semantic.danger : theme.colors.surface,
    borderColor: value === false ? theme.colors.semantic.danger : theme.colors.border,
  }));

  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <AnimatedPressable
        onPress={handleYes}
        style={[styles.answerBtn, yesStyle]}
        {...a11y(
          'პასუხი: კი. უსაფრთხოა.',
          'შეეხეთ თუ პასუხი დადებითია',
          'button',
          { selected: value === true }
        )}
      >
        <Ionicons
          name="checkmark"
          size={20}
          color={value === true ? '#fff' : theme.colors.ink}
          style={{ marginBottom: 4 }}
        />
        <Text
          style={{
            color: value === true ? '#fff' : theme.colors.ink,
            fontWeight: '700',
            fontSize: 15,
          }}
        >
          კი
        </Text>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={handleNo}
        style={[styles.answerBtn, noStyle]}
        {...a11y(
          'პასუხი: არა. არ არის უსაფრთხო.',
          'შეეხეთ თუ პასუხი უარყოფითია',
          'button',
          { selected: value === false }
        )}
      >
        <Ionicons
          name="close"
          size={20}
          color={value === false ? '#fff' : theme.colors.ink}
          style={{ marginBottom: 4 }}
        />
        <Text
          style={{
            color: value === false ? '#fff' : theme.colors.ink,
            fontWeight: '700',
            fontSize: 15,
          }}
        >
          არა
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  answerBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 56,
  },
});
