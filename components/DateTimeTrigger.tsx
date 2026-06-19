import React from 'react';
import { StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from './primitives/A11yText';
import { PressBounce } from './animations/PressBounce';
import type { makeStyles } from './DateTimeField';

type DateTimeStyles = ReturnType<typeof makeStyles>;

interface DateTimeChipProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  error?: boolean;
  flex: number;
  accentColor: string;
  styles: DateTimeStyles;
  a11yProps: object;
}

/**
 * A DateTimeField trigger chip carrying the canonical press squish
 * ({@link PressBounce}) — replaces the old `opacity: 0.7` pressed flash. Selection
 * styling (error/disabled) stays prop-driven.
 */
export function DateTimeChip({
  icon: Icon, label, onPress, disabled, error, flex, accentColor, styles, a11yProps,
}: DateTimeChipProps) {
  return (
    <PressBounce
      onPress={onPress}
      disabled={disabled}
      hapticOnPress="light"
      scaleTo={0.97}
      style={[styles.chip, { flex }, error && styles.chipError, disabled && styles.chipDisabled]}
      {...a11yProps}
    >
      <Icon size={18} color={accentColor} strokeWidth={1.5} />
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
    </PressBounce>
  );
}

interface DateTimeTabButtonProps {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  theme: any;
}

/** The date/time sheet tab toggle with the canonical press squish. */
export function DateTimeTabButton({
  active, label, icon: IconComp, onPress, theme,
}: DateTimeTabButtonProps) {
  return (
    <PressBounce
      onPress={onPress}
      hapticOnPress="light"
      scaleTo={0.96}
      style={[
        tabStyles.btn,
        {
          backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceSecondary,
          borderColor: active ? theme.colors.accent : theme.colors.hairline,
        },
      ]}
    >
      <IconComp
        size={16}
        color={active ? theme.colors.accent : theme.colors.inkSoft}
        strokeWidth={1.5}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? '700' : '500',
          color: active ? theme.colors.accent : theme.colors.inkSoft,
        }}
      >
        {label}
      </Text>
    </PressBounce>
  );
}

const tabStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
