import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './primitives/A11yText';
import { theme } from '../lib/theme';

type SectionHeaderVariant = 'default' | 'highlight' | 'muted';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  variant?: SectionHeaderVariant;
}

export function SectionHeader({
  title,
  action,
  variant = 'default',
}: SectionHeaderProps) {
  const titleColor = {
    default: theme.colors.ink,
    highlight: theme.colors.accent,
    muted: theme.colors.inkSoft,
  }[variant];

  return (
    <View style={styles.container}>
      <A11yText
        size="lg"
        weight="semibold"
        color={titleColor}
        style={{ flex: 1 }}
      >
        {title}
      </A11yText>

      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          {action.icon && (
            <Ionicons
              name={action.icon}
              size={18}
              color={theme.colors.accent}
              style={{ marginRight: 4 }}
            />
          )}
          <A11yText
            size="sm"
            weight="semibold"
            color={theme.colors.accent}
          >
            {action.label}
          </A11yText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space(3),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(3),
    borderRadius: theme.radius.md,
  },
  actionButtonPressed: {
    backgroundColor: theme.colors.accentSoft,
  },
});
