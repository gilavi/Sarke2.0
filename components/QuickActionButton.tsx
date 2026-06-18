import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ShieldCheck, TriangleAlert, Megaphone, FileText, UserPlus, CloudUpload } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText } from './primitives/A11yText';
import { useTheme, withOpacity, type Theme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

export type ActionColorKey =
  | 'inspection'
  | 'incident'
  | 'briefing'
  | 'report'
  | 'participant'
  | 'file';

const ICON_MAP: Record<ActionColorKey, { icon: LucideIcon; filled: boolean }> = {
  inspection: { icon: ShieldCheck,    filled: false },
  incident:   { icon: TriangleAlert,  filled: false },
  briefing:   { icon: Megaphone,      filled: false },
  report:     { icon: FileText,       filled: false },
  participant:{ icon: UserPlus,       filled: false },
  file:       { icon: CloudUpload,    filled: false },
};

interface QuickActionButtonProps {
  label: string;
  colorKey: ActionColorKey;
  onPress: () => void;
  fixedWidth?: number;
}

export function QuickActionButton({ label, colorKey, onPress, fixedWidth }: QuickActionButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, fixedWidth), [theme, fixedWidth]);
  const { icon: IconComp, filled } = ICON_MAP[colorKey];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      {...a11y(label, undefined, 'button')}
    >
      <View style={styles.iconCircle}>
        <IconComp
          size={24}
          color={theme.colors.accent}
          fill={filled ? theme.colors.accent : 'none'}
          strokeWidth={filled ? 0 : 1.5}
        />
      </View>
      <A11yText
        size="xs"
        weight="bold"
        color={theme.colors.inkSoft}
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </A11yText>
    </Pressable>
  );
}

function getStyles(theme: Theme, fixedWidth?: number) {
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
      backgroundColor: withOpacity('#FF6D2E', 0.12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      textAlign: 'center',
      fontWeight: '800',
    },
  });
}
