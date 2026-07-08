import { type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { Skeleton } from '../../components/Skeleton';
import { OfflineEmptyState } from '../../components/OfflineEmptyState';
import { useListLoadState, type LoadStateQuery } from '../../hooks/useListLoadState';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

/**
 * Presentational scaffold for one History type-tab: a scrollable list with the
 * canonical four-state guard (skeleton while the query has not produced a real
 * answer, offline when paused with nothing cached, per-type empty copy once it
 * settles `[]`, rows otherwise) plus pull-to-refresh.
 *
 * The guard runs on `totalCount` (rows loaded BEFORE the client-side search /
 * project filter) so filtering can never fake the confirmed-empty state; a
 * filter that matches nothing renders the separate "no results" copy instead.
 * Optional `paging` adds infinite scroll + a "load more" footer past the
 * 50-row first page.
 */
export function RecordHistoryList<T>({
  query,
  items,
  totalCount,
  keyOf,
  renderRow,
  emptyText,
  refreshQueries,
  paging,
}: {
  query: LoadStateQuery;
  items: T[];
  /** Unfiltered loaded-row count; defaults to `items.length` (no filtering). */
  totalCount?: number;
  keyOf: (item: T) => string;
  renderRow: (item: T, isLast: boolean) => ReactElement;
  emptyText: string;
  refreshQueries: unknown[];
  paging?: { hasNextPage: boolean; isFetchingNextPage: boolean; onLoadMore: () => void };
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  // Canonical offline-aware guard (hooks/useListLoadState) on the RAW count.
  const loadState = useListLoadState(query, totalCount ?? items.length);
  const canLoadMore = !!paging?.hasNextPage && !paging.isFetchingNextPage;

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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={canLoadMore ? paging.onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        loadState === 'skeleton' ? (
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
        ) : loadState === 'offline' ? (
          <OfflineEmptyState compact />
        ) : (
          <View style={{ paddingTop: 56, alignItems: 'center' }}>
            <Text style={{ textAlign: 'center', color: theme.colors.inkFaint, fontSize: 14, fontWeight: '500' }}>
              {/* 'data' + zero rendered rows = the search/project filter matched nothing. */}
              {loadState === 'data' ? t('history.searchNoResults') : emptyText}
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        paging?.isFetchingNextPage ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </View>
        ) : paging?.hasNextPage && loadState === 'data' ? (
          <Pressable
            onPress={paging.onLoadMore}
            style={({ pressed }) => [
              { paddingVertical: 16, alignItems: 'center' },
              pressed && { opacity: 0.6 },
            ]}
            {...a11y(t('history.loadMore'), undefined, 'button')}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>
              {t('history.loadMore')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}
