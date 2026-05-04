import React, {useEffect, useMemo} from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';

import { useAccessibilitySettings, a11y } from '../../lib/accessibility';

interface WizardNavProps {
  isLast: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export function WizardNav({ isLast, canGoNext, canGoPrev, onNext, onPrev }: WizardNavProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const scale = useSharedValue(1);
  const { reduceMotion } = useAccessibilitySettings();

  const handleNext = () => {
    if (!canGoNext) return;
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(0.92, { duration: 80 }),
        withSpring(1, theme.motion.spring.bouncy)
      );
    }
    haptic.confirm();
    onNext();
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    haptic.back();
    onPrev();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePrev}
        disabled={!canGoPrev}
        style={[styles.prevBtn, !canGoPrev && styles.disabled]}
        {...a11y('წინა კითხვა', 'შეეხეთ წინა კითხვაზე დასაბრუნებლად', 'button')}
      >
        <Ionicons
          name="arrow-back"
          size={18}
          color={canGoPrev ? theme.colors.inkSoft : theme.colors.inkFaint}
        />
        <Text
          style={[
            styles.prevText,
            { color: canGoPrev ? theme.colors.inkSoft : theme.colors.inkFaint },
          ]}
        >
          წინა
        </Text>
      </Pressable>

      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handleNext}
          disabled={!canGoNext}
          style={[
            styles.nextBtn,
            { backgroundColor: isLast ? theme.colors.semantic.success : theme.colors.accent },
            !canGoNext && styles.disabled,
          ]}
          {...a11y(
            isLast ? 'დასრულება' : 'შემდეგი კითხვა',
            isLast ? 'შეეხეთ შემოწმების აქტის დასასრულებლად' : 'შეეხეთ შემდეგ კითხვაზე გადასვლისთვის',
            'button',
            { disabled: !canGoNext }
          )}
        >
          <Text style={styles.nextText}>
            {isLast ? '✓ დასრულება' : 'შემდეგი'}
          </Text>
          {!isLast && (
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  prevText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radius.lg,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.4,
  },
});
}
