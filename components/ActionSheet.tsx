import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { A11yText } from './primitives/A11yText';
import { ActionSheetItem, type ActionSheetItemVariant } from './primitives/ActionSheetItem';
import { useTheme } from '../lib/theme';

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
  closeLabel,
  onClose,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const resolvedCloseLabel = closeLabel ?? t('common.cancel');

  const handleItemPress = useCallback((item: ActionSheetItemConfig) => {
    item.onPress();
    onClose();
  }, [onClose]);

  const content = (
    <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <A11yText
        size="sm"
        weight="bold"
        color={theme.colors.inkFaint}
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
          label={resolvedCloseLabel}
          onPress={onClose}
          isLast
        />
      </View>
    </View>
  );

  return content;
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    content: {
      backgroundColor: theme.colors.surface,
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
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
  });
}
