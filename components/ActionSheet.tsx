import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText } from './primitives/A11yText';
import { ActionSheetItem, type ActionSheetItemVariant } from './primitives/ActionSheetItem';

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
  const insets = useSafeAreaInsets();

  const handleItemPress = useCallback((item: ActionSheetItemConfig) => {
    item.onPress();
    onClose();
  }, [onClose]);

  const content = (
    <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <A11yText
        size="sm"
        weight="bold"
        color="#64748B"
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

      <View style={styles.cancelBtn}>
        <ActionSheetItem
          label={closeLabel}
          onPress={onClose}
          isLast
        />
      </View>
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  title: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  itemsContainer: {
    marginBottom: 8,
  },
  cancelBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
});
