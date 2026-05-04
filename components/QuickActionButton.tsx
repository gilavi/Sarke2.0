import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText } from './primitives/A11yText';
import { useTheme, type Theme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

export type ActionColorKey =
  | 'inspection'
  | 'incident'
  | 'briefing'
  | 'report'
  | 'participant'
  | 'file';

const ICON_MAP: Record<ActionColorKey, keyof typeof Ionicons.glyphMap> = {
  inspection: 'shield-checkmark-outline',
  incident: 'warning-outline',
  briefing: 'megaphone-outline',
  report: 'document-text-outline',
  participant: 'person-add-outline',
  file: 'cloud-upload-outline',
};

interface QuickActionButtonProps {
  label: string;
  colorKey: ActionColorKey;
  onPress: () => void;
  fixedWidth?: number;
}

export function QuickActionButton({ label, colorKey, onPress, fixedWidth }: QuickActionButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, colorKey, fixedWidth), [theme, colorKey, fixedWidth]);
  const iconColor = (theme.colors.actionColors[colorKey] ?? theme.colors.actionColors.inspection).icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      {...a11y(label, undefined, 'button')}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={ICON_MAP[colorKey]} size={24} color={iconColor} />
      </View>
      <A11yText
        size="xs"
        weight="medium"
        color={theme.colors.ink}
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </A11yText>
    </Pressable>
  );
}

function getStyles(theme: Theme, colorKey: ActionColorKey, fixedWidth?: number) {
  const ac = theme.colors.actionColors[colorKey] ?? theme.colors.actionColors.inspection;
  return StyleSheet.create({
    container: {
      ...(fixedWidth ? { width: fixedWidth } : { flex: 1 }),
      alignItems: 'center',
      gap: theme.space(2),
      paddingHorizontal: 4,
    },
    pressed: {
      opacity: 0.7,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: ac.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      textAlign: 'center',
    },
  });
}
