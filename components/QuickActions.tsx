import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { QuickActionButton, type ActionColorKey } from './QuickActionButton';

export interface QuickAction {
  label: string;
  colorKey: ActionColorKey;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

// TODO: reorder based on user's most frequent
// actions per project — future AI feature
export function QuickActions({ actions }: QuickActionsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {actions.map(action => (
          <QuickActionButton
            key={action.colorKey}
            label={action.label}
            colorKey={action.colorKey}
            onPress={action.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.space(4),
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    row: {
      gap: theme.space(3),
      paddingHorizontal: theme.space(4),
    },
  });
}
