import { type ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { Skeleton } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';

/**
 * Presentational scaffold for one History type-tab: a scrollable list with the
 * canonical three-state guard (skeleton while the query has not produced a real
 * answer, per-type empty copy once it settles `[]`, rows otherwise) plus
 * pull-to-refresh. Each typed tab supplies its items + row renderer.
 */
export function RecordHistoryList<T>({
  query,
  items,
  keyOf,
  renderRow,
  emptyText,
  refreshQueries,
}: {
  query: { isFetching: boolean; isFetched: boolean };
  items: T[];
  keyOf: (item: T) => string;
  renderRow: (item: T, isLast: boolean) => ReactElement;
  emptyText: string;
  refreshQueries: unknown[];
}) {
  const { theme } = useTheme();
  // Canonical three-state guard (see CLAUDE.md): never flash empty over a stale [].
  const loading = (query.isFetching || !query.isFetched) && items.length === 0;

  return (
    <FlatList
      style={{ flex: 1 }}
      data={items}
      keyExtractor={(item) => keyOf(item)}
      refreshControl={<RefreshControl queries={refreshQueries as never[]} />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}
      renderItem={({ item, index }) => renderRow(item, index === items.length - 1)}
      initialNumToRender={12}
      windowSize={7}
      removeClippedSubviews
      ListEmptyComponent={
        loading ? (
          <View style={{ gap: 14, paddingTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={40} height={40} radius={10} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width={'65%'} height={14} />
                  <Skeleton width={'40%'} height={11} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingTop: 56, alignItems: 'center' }}>
            <Text style={{ textAlign: 'center', color: theme.colors.inkFaint, fontSize: 14, fontWeight: '500' }}>
              {emptyText}
            </Text>
          </View>
        )
      }
    />
  );
}
