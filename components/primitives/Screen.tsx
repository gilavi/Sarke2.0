import React, {ReactNode, useMemo} from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { RefreshControl } from './RefreshControl';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  /** @deprecated The themed RefreshControl owns its own refreshing state — pass `onRefresh` only. */
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  style?: any;
  contentContainerStyle?: any;
  /** Opt in to a 20px horizontal gutter. By default Screen is edge-to-edge so consumers control their own padding. */
  withGutter?: boolean;
  /** Backwards-compatible alias for the old default - has no effect; kept so existing call sites compile. */
  edgeToEdge?: boolean;
  /** Safe-area edges to inset. Defaults to ['top','bottom']. */
  edges?: readonly Edge[];
}

export function Screen({
  children,
  scrollable,
  onRefresh,
  style,
  contentContainerStyle,
  withGutter,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const contentPadding = withGutter ? styles.content : styles.contentNoGutter;

  const content = scrollable ? (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[contentPadding, contentContainerStyle]}
      refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} /> : undefined}
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

function getstyles(theme: any) {
  return StyleSheet.create({
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
}
