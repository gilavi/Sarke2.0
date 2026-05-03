// components/ui.tsx — Backward compatibility + new primitives
//
// Re-exports the new primitive components so existing imports keep working.
// Also keeps a few legacy helpers that haven't been promoted to primitives yet.

import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';


// ── New primitives (backward-compatible re-exports) ──
export { Button, Card, Input, Badge, Screen, A11yText } from './primitives';

// ── New shared components ──
export { SectionHeader as SectionHeaderNew } from './SectionHeader';
export { FormField } from './FormField';
export { ButtonGroup } from './ButtonGroup';
export { ActionSheet } from './ActionSheet';
export { ActionSheetItem } from './primitives/ActionSheetItem';

// ── Legacy helpers ──

export function Label({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          fontSize: 11,
          fontWeight: '600',
          color: theme.colors.inkSoft,
          letterSpacing: 0.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

interface FieldProps {
  label?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}

export function Field({ label, children, required, error }: FieldProps) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Label>
          {label}
          {required ? ' *' : ''}
        </Label>
      )}
      {children}
      {error && (
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.semantic.danger,
            marginTop: 4,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

interface ChipProps {
  children: ReactNode;
  tint: string;
  bg: string;
}

export function Chip({ children, tint, bg }: ChipProps) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: tint }}>{children}</Text>
    </View>
  );
}

interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

interface SectionHeaderProps {
  title: string;
  action?: SectionHeaderAction;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: theme.colors.inkSoft,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  if (!children) return null;
  return (
    <Text style={{ fontSize: 13, color: theme.colors.semantic.danger }}>{children}</Text>
  );
}
