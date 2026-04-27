import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: any;
  contentContainerStyle?: any;
}

export function Screen({
  children,
  scrollable,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const content = scrollable ? (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.content,
        contentContainerStyle,
      ]}
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
    <View style={[styles.container, styles.content, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
});
