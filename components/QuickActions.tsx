import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme, type Theme } from '../lib/theme';
import { QuickActionButton, type ActionColorKey } from './QuickActionButton';

export interface QuickAction {
  label: string;
  colorKey: ActionColorKey;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  scrollable?: boolean;
  /** Horizontal inset to break out of (matches parent paddingHorizontal). Default 16. */
  edgeInset?: number;
}

export function QuickActions({ actions, scrollable, edgeInset = 16 }: QuickActionsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, edgeInset), [theme, edgeInset]);

  const buttons = actions.map(action => (
    <QuickActionButton
      key={action.colorKey}
      label={action.label}
      colorKey={action.colorKey}
      onPress={action.onPress}
      fixedWidth={scrollable ? 80 : undefined}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollOuter}
        contentContainerStyle={styles.scrollRow}
      >
        {buttons}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{buttons}</View>;
}

function getStyles(theme: Theme, edgeInset: number) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingVertical: theme.space(2),
    },
    scrollOuter: {
      marginHorizontal: -edgeInset,
    },
    scrollRow: {
      flexDirection: 'row',
      paddingVertical: theme.space(2),
      paddingHorizontal: edgeInset,
      gap: 8,
    },
  });
}
