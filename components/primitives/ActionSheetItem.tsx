import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './A11yText';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';

import { a11y } from '../../lib/accessibility';

export type ActionSheetItemVariant = 'default' | 'destructive' | 'highlight';

interface ActionSheetItemProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: ActionSheetItemVariant;
  isSelected?: boolean;
  isLast?: boolean;
}

export function ActionSheetItem({
  label,
  icon,
  onPress,
  variant = 'default',
  isSelected = false,
  isLast = false,
}: ActionSheetItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const handlePress = () => {
    haptic.light();
    onPress();
  };

  const iconColor = {
    default: theme.colors.ink,
    destructive: theme.colors.danger,
    highlight: theme.colors.accent,
  }[variant];

  const textColor = {
    default: theme.colors.ink,
    destructive: theme.colors.danger,
    highlight: theme.colors.accent,
  }[variant];

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.container,
          isSelected && styles.selected,
          pressed && styles.pressed,
        ]}
        {...a11y(label, undefined, 'button')}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={24}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <A11yText
          size="base"
          weight="medium"
          color={textColor}
          style={{ flex: 1 }}
        >
          {label}
        </A11yText>
        {isSelected && (
          <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
        )}
      </Pressable>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
  },
  selected: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    paddingLeft: theme.space(4) - 4,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  icon: {
    marginRight: theme.space(3),
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.space(2),
  },
});
}
