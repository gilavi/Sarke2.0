import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { A11yText } from '../primitives/A11yText';
import { ButtonGroup } from '../ButtonGroup';
import { useBottomSheet } from '../BottomSheet';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';

interface ExitModalProps {
  visible: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitConfirmationModal({ visible, onStay, onExit }: ExitModalProps) {
  const showBottomSheet = useBottomSheet();

  useEffect(() => {
    if (!visible) return;

    const handleStay = () => {
      haptic.select();
      onStay();
    };

    const handleExit = () => {
      haptic.deleteConfirm();
      onExit();
    };

    showBottomSheet(
      {
        content: () => (
          <View style={styles.content}>
            <A11yText size="xl" weight="bold" style={styles.title}>
              გასვლა?
            </A11yText>
            <A11yText size="base" color={theme.colors.inkSoft} style={styles.subtitle}>
              თუ ახლა გახვალთ, მიმდინარე პასუხები შეინახება, მაგრამ ინსპექცია დასრულებულად არ ჩაითვლება.
            </A11yText>
            <ButtonGroup
              buttons={[
                {
                  label: 'გაგრძელება',
                  variant: 'secondary',
                  size: 'lg',
                  onPress: handleStay,
                },
                {
                  label: 'გასვლა',
                  variant: 'danger',
                  size: 'lg',
                  onPress: handleExit,
                },
              ]}
              layout="vertical"
            />
          </View>
        ),
        dismissable: true,
      },
      () => handleStay(),
    );
  }, [visible, onStay, onExit, showBottomSheet]);

  return null;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(4),
    gap: theme.space(4),
  },
  title: {
    marginBottom: theme.space(2),
  },
  subtitle: {
    marginBottom: theme.space(4),
    lineHeight: 20,
  },
});
