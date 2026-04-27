import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText } from './primitives/A11yText';
import { Button } from './primitives/Button';
import { ActionSheetItem, type ActionSheetItemVariant } from './primitives/ActionSheetItem';
import { useBottomSheet } from './BottomSheet';
import { theme } from '../lib/theme';

export interface ActionSheetItemConfig {
  label: string;
  icon?: string;
  onPress: () => void;
  variant?: ActionSheetItemVariant;
}

interface ActionSheetProps {
  title: string;
  items: ActionSheetItemConfig[];
  closeLabel?: string;
  onClose: () => void;
}

export function ActionSheet({
  title,
  items,
  closeLabel = 'გაუქმება',
  onClose,
}: ActionSheetProps) {
  const bottomSheet = useBottomSheet();
  const insets = useSafeAreaInsets();

  const handleItemPress = useCallback((item: ActionSheetItemConfig) => {
    item.onPress();
    onClose();
  }, [onClose]);

  const content = (
    <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <A11yText
        size="xl"
        weight="semibold"
        style={styles.title}
      >
        {title}
      </A11yText>

      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <ActionSheetItem
            key={index}
            label={item.label}
            icon={item.icon as any}
            variant={item.variant}
            onPress={() => handleItemPress(item)}
            isLast={index === items.length - 1}
          />
        ))}
      </View>

      <Button
        title={closeLabel}
        variant="secondary"
        size="lg"
        onPress={onClose}
        style={styles.closeButton}
      />
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(4),
    paddingTop: theme.space(4),
  },
  title: {
    marginBottom: theme.space(5),
    textAlign: 'center',
  },
  itemsContainer: {
    marginBottom: theme.space(4),
    gap: theme.space(2),
  },
  closeButton: {
    marginBottom: theme.space(2),
  },
});
