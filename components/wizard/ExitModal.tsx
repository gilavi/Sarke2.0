import React, {useEffect, useMemo} from 'react';
import { View, StyleSheet } from 'react-native';
import { A11yText } from '../primitives/A11yText';
import { ActionSheetItem } from '../primitives/ActionSheetItem';
import { Button } from '../primitives/Button';
import { useBottomSheet } from '../BottomSheet';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';


interface ExitModalProps {
  visible: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitConfirmationModal({ visible, onStay, onExit }: ExitModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

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
            <A11yText size="xl" weight="semibold" style={styles.title}>
              გასვლა?
            </A11yText>
            <A11yText size="sm" color={theme.colors.inkSoft} style={styles.subtitle}>
              თუ ახლა გახვალთ, მიმდინარე პასუხები შეინახება, მაგრამ ინსპექცია დასრულებულად არ ჩაითვლება.
            </A11yText>
            <View style={styles.items}>
              <ActionSheetItem
                label="გაგრძელება"
                icon="arrow-forward"
                onPress={handleStay}
                isLast={false}
              />
              <ActionSheetItem
                label="გასვლა"
                icon="exit-outline"
                onPress={handleExit}
                variant="destructive"
                isLast
              />
            </View>
            <Button
              title="გაუქმება"
              variant="secondary"
              size="lg"
              onPress={handleStay}
              style={styles.cancelButton}
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

function getstyles(theme: any) {
  return StyleSheet.create({
  content: {
    paddingTop: theme.space(1),
    paddingBottom: theme.space(2),
    gap: theme.space(4),
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  items: {
    gap: theme.space(2),
  },
  cancelButton: {
    marginBottom: theme.space(2),
  },
});
}
