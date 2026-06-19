// RefreshControl — themed pull-to-refresh primitive.
//
// Wraps React Native's RefreshControl so every list/scroll screen gets the
// same behaviour without re-implementing the `refreshing` state + haptic +
// brand tint boilerplate that was previously copy-pasted into ~13 screens.
//
// Usage — pass the React Query result objects to refetch on pull:
//
//   <ScrollView refreshControl={<RefreshControl queries={[projectsQ, statsQ]} />}>
//
// or supply a custom handler (runs after the queries refetch):
//
//   <RefreshControl onRefresh={() => reload()} />
//
// `progressViewOffset`, `tintColor`, etc. pass straight through, so screens
// with an overlaid animated header (e.g. home) can still nudge the spinner
// down. The component owns its own `refreshing` state — callers don't manage it.
import { useCallback, useState } from 'react';
import {
  RefreshControl as RNRefreshControl,
  type RefreshControlProps as RNRefreshControlProps,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';

/** Anything with a `refetch()` — i.e. a React Query result object. */
type Refetchable = { refetch: () => Promise<unknown> };

export type RefreshControlProps = Omit<
  Partial<RNRefreshControlProps>,
  'refreshing' | 'onRefresh'
> & {
  /** React Query result objects (or anything with `.refetch()`) to refetch on pull. */
  queries?: Refetchable[];
  /** Extra refresh work; runs after `queries` have refetched. */
  onRefresh?: () => void | Promise<void>;
  /** Fire a medium haptic tick when the pull starts (default: true). */
  haptics?: boolean;
};

/**
 * Themed pull-to-refresh control with built-in `refreshing` state.
 *
 * Side effects: calls `.refetch()` on every query in `queries`, runs `onRefresh`,
 * and (by default) triggers a medium haptic. Per-query errors are swallowed here —
 * each query surfaces its own error state — so the spinner always settles.
 */
export function RefreshControl({
  queries,
  onRefresh,
  haptics = true,
  tintColor,
  ...rest
}: RefreshControlProps) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const accent = tintColor ?? theme.colors.accent;

  const handleRefresh = useCallback(async () => {
    if (haptics) haptic.medium();
    setRefreshing(true);
    try {
      if (queries?.length) await Promise.all(queries.map(q => q.refetch()));
      await onRefresh?.();
    } catch {
      // Individual query errors are surfaced by each query's own error state.
    } finally {
      setRefreshing(false);
    }
  }, [queries, onRefresh, haptics]);

  return (
    <RNRefreshControl
      {...rest}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={accent}
      colors={[accent]}
    />
  );
}
