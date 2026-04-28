import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';


interface SmartHintProps {
  questionId: string;
  previousAnswers?: Record<string, number>;
}

export function SmartDefaultHint({ questionId, previousAnswers }: SmartHintProps) {
  const { theme } = useTheme();
  const stats = previousAnswers?.[questionId];
  if (!stats || stats <= 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.accentSoft,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radius.md,
        alignSelf: 'flex-start',
      }}
    >
      <Ionicons name="bulb-outline" size={14} color={theme.colors.accent} />
      <Text style={{ fontSize: 12, color: theme.colors.accent, fontWeight: '600' }}>
        უმრავლესობა ამბობს: კი ({stats} შემთხვევა)
      </Text>
    </View>
  );
}
