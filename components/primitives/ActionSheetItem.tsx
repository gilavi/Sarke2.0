import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './A11yText';
import { haptic } from '../../lib/haptics';

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
  const handlePress = () => {
    haptic.light();
    onPress();
  };

  const textColor = {
    default: '#1F2937',
    destructive: '#DC2626',
    highlight: '#059669',
  }[variant];

  const iconColor = {
    default: '#6B7280',
    destructive: '#DC2626',
    highlight: '#059669',
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
          <Ionicons name="checkmark" size={20} color="#059669" />
        )}
      </Pressable>
      {!isLast && <View style={styles.separator} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  selected: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  pressed: {
    backgroundColor: '#F9FAFB',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  selectionCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  icon: {
    marginLeft: -4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
});
