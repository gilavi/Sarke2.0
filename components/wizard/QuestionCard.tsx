import React, {ReactNode, useEffect, useRef, useMemo} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from 'react-native-reanimated';
import { useTheme } from '../../lib/theme';

import { useAccessibilitySettings, announce } from '../../lib/accessibility';
import type { Question } from '../../types/models';

interface QuestionCardProps {
  question: Question;
  stepIndex: number;
  totalSteps: number;
  children: ReactNode;
  direction?: 'next' | 'prev';
}

export function QuestionCard({
  question,
  stepIndex,
  totalSteps,
  children,
  direction = 'next',
}: QuestionCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const { reduceMotion, screenReaderEnabled } = useAccessibilitySettings();
  const prevIdRef = useRef(question.id);

  useEffect(() => {
    if (prevIdRef.current === question.id) return;
    prevIdRef.current = question.id;

    if (reduceMotion) {
      translateX.value = 0;
      opacity.value = 1;
    } else {
      const offset = direction === 'next' ? 40 : -40;
      translateX.value = offset;
      opacity.value = 0;
      translateX.value = withSpring(0, theme.motion.spring.gentle);
      opacity.value = withSpring(1, { damping: 20, stiffness: 150 });
    }

    if (screenReaderEnabled) {
      announce(`კითხვა ${stepIndex + 1} from ${totalSteps}. ${question.title}`);
    }
  }, [question.id, direction, reduceMotion, screenReaderEnabled, stepIndex, totalSteps, translateX, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(300)}
      style={[styles.card, animatedStyle]}
      accessible
      accessibilityLabel={`კითხვა ${stepIndex + 1} from ${totalSteps}. ${question.title}`}
      accessibilityHint="გადაიფურცლეთ მარჯვნივ შემდეგი კითხვისთვის, მარცხნივ წინა კითხვისთვის"
      accessibilityRole="header"
    >
      <Text style={styles.questionNumber}>
        კითხვა {stepIndex + 1} / {totalSteps}
      </Text>
      <Text style={styles.questionText}>{question.title}</Text>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(5),
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 26,
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    lineHeight: 18,
    marginBottom: 16,
  },
  content: {
    gap: 14,
  },
});
}
