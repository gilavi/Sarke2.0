import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './A11yText';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import { useTheme } from '../../lib/theme';

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
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const handlePress = () => {
    haptic.light();
    onPress();
  };

  const textColor = {
    default: theme.colors.ink,
    destructive: theme.colors.danger,
    highlight: theme.colors.accent,
  }[variant];

  const iconColor = {
    default: theme.colors.inkFaint,
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
        {/* Selection indicator */}
        <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
          {isSelected && <View style={styles.selectionCircleInner} />}
        </View>

        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <A11yText
          size="base"
          weight="semibold"
          color={textColor}
          style={{ flex: 1 }}
        >
          {label}
        </A11yText>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
        )}
      </Pressable>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  selectionCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  icon: {
    marginLeft: -4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
});
