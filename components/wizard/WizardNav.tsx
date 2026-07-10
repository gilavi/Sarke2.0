import React, {useMemo} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';
import { Button } from '../ui';

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
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const handleNext = () => {
    if (!canGoNext) return;
    haptic.confirm();
    onNext();
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    haptic.back();
    onPrev();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePrev}
        disabled={!canGoPrev}
        style={[styles.prevBtn, !canGoPrev && styles.disabled]}
        {...a11y(t('wizard.prevQuestion'), t('wizard.prevQuestionA11yHint'), 'button')}
      >
        <ArrowLeft
          size={18}
          color={canGoPrev ? theme.colors.inkSoft : theme.colors.inkFaint}
          strokeWidth={1.5}
        />
        <Text
          style={[
            styles.prevText,
            { color: canGoPrev ? theme.colors.inkSoft : theme.colors.inkFaint },
          ]}
        >
          {t('wizard.prevLabel')}
        </Text>
      </Pressable>

      <Button
        title={isLast ? t('wizard.finishLabel') : t('common.next')}
        rightIcon={!isLast ? ArrowRight : undefined}
        size="lg"
        onPress={handleNext}
        disabled={!canGoNext}
        style={{ minWidth: 140 }}
        {...a11y(
          isLast ? t('common.done') : t('wizard.nextQuestionA11y'),
          isLast ? t('wizard.finishA11yHint') : t('wizard.nextQuestionA11yHint'),
          'button',
          { disabled: !canGoNext }
        )}
      />
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  prevText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
}
