import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';


export type StatusType = 'pass' | 'fail' | 'pending';

export function StatusBadge({ status }: { status: StatusType }) {
  const { theme } = useTheme();
  const config: Record<StatusType, { color: string; icon: any; text: string }> = {
    pass: { color: theme.colors.semantic.success, icon: 'checkmark-circle', text: 'კი / უსაფრთხოა' },
    fail: { color: theme.colors.semantic.danger, icon: 'close-circle', text: 'არა / არ არის უსაფრთხო' },
    pending: { color: theme.colors.semantic.warning, icon: 'time', text: 'მოლოდინში' },
  };
  const c = config[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={c.icon} size={16} color={c.color} />
      <Text style={{ color: c.color, fontWeight: '600' }}>{c.text}</Text>
    </View>
  );
}
