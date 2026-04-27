import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: any;
  contentContainerStyle?: any;
  /** Opt in to a 20px horizontal gutter. By default Screen is edge-to-edge so consumers control their own padding. */
  withGutter?: boolean;
  /** Backwards-compatible alias for the old default — has no effect; kept so existing call sites compile. */
  edgeToEdge?: boolean;
  /** Safe-area edges to inset. Defaults to ['top','bottom']. */
  edges?: readonly Edge[];
}

export function Screen({
  children,
  scrollable,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  withGutter,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  const contentPadding = withGutter ? styles.content : styles.contentNoGutter;

  const content = scrollable ? (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[contentPadding, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing || false}
            onRefresh={() => {
              haptic.medium();
              onRefresh();
            }}
            tintColor={theme.colors.accent}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, contentPadding, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={edges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.space(5),
    paddingBottom: theme.space(8),
  },
  contentNoGutter: {
    paddingBottom: theme.space(8),
  },
});
