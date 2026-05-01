import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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

export function QuickActions({ actions }: QuickActionsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {actions.map(action => (
        <QuickActionButton
          key={action.colorKey}
          label={action.label}
          colorKey={action.colorKey}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingVertical: theme.space(2),
    },
  });
}
