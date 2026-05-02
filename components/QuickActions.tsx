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
  scrollable?: boolean;
}

export function QuickActions({ actions, scrollable }: QuickActionsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const buttons = actions.map(action => (
    <QuickActionButton
      key={action.colorKey}
      label={action.label}
      colorKey={action.colorKey}
      onPress={action.onPress}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {buttons}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{buttons}</View>;
}

function getstyles(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingVertical: theme.space(2),
    },
    scrollRow: {
      flexDirection: 'row',
      paddingVertical: theme.space(2),
      gap: 8,
    },
  });
}
