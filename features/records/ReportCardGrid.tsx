import { type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { Skeleton } from '../../components/Skeleton';
import { OfflineEmptyState } from '../../components/OfflineEmptyState';
import { useListLoadState, type LoadStateQuery } from '../../hooks/useListLoadState';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Report } from '../../types/models';
import { ReportCard } from './ReportCard';

const H_PADDING = 16;
const GAP = 12;

/**
 * Full-screen 2-column grid of report `ReportCard`s — the browse layout for the
 * History reports tab and a project's "all reports" list. Same card as the
 * section rails, just laid out to fill the screen. Carries the canonical
 * four-state guard (skeleton until the query produces a real answer, offline
 * when paused with nothing cached, per-type empty copy once it settles `[]`,
 * cards otherwise) plus pull-to-refresh.
 *
 * History passes `totalCount` (loaded rows BEFORE its client-side search /
 * project filter — a filtered-out list renders "no results", never the
 * confirmed-empty copy) and `paging` (infinite scroll + "load more" footer).
 * Other surfaces omit both and behave exactly as before.
 */
export function ReportCardGrid({
  reports,
  onPressReport,
  onDeleteReport,
  query,
  refreshQueries,
  emptyText,
  ListHeaderComponent,
  totalCount,
  paging,
}: {
  reports: Report[];
  onPressReport: (report: Report) => void;
  /** When provided, each card becomes deletable (long-press + trash button). */
  onDeleteReport?: (report: Report) => void;
  query: LoadStateQuery;
  emptyText: string;
  refreshQueries?: unknown[];
  ListHeaderComponent?: ReactElement | null;
  /** Unfiltered loaded-row count; defaults to `reports.length` (no filtering). */
  totalCount?: number;
  paging?: { hasNextPage: boolean; isFetchingNextPage: boolean; onLoadMore: () => void };
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
  // Canonical offline-aware guard (hooks/useListLoadState) on the RAW count.
  const loadState = useListLoadState(query, totalCount ?? reports.length);
  const canLoadMore = !!paging?.hasNextPage && !paging.isFetchingNextPage;

  return (
    <FlatList
      style={{ flex: 1 }}
      data={reports}
      numColumns={2}
      keyExtractor={(r) => r.id}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        paddingTop: 8,
        paddingBottom: 32,
        gap: GAP,
        flexGrow: 1,
      }}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={refreshQueries ? <RefreshControl queries={refreshQueries as never[]} /> : undefined}
      renderItem={({ item }) => (
        <ReportCard
          report={item}
          width={cardWidth}
          onPress={() => onPressReport(item)}
          onDelete={onDeleteReport ? () => onDeleteReport(item) : undefined}
        />
      )}
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={canLoadMore ? paging.onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        loadState === 'skeleton' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: cardWidth, gap: 8 }}>
                <Skeleton width={cardWidth} height={Math.round(cardWidth * 0.66)} radius={12} />
                <Skeleton width={'80%'} height={13} />
                <Skeleton width={'45%'} height={11} />
              </View>
            ))}
          </View>
        ) : loadState === 'offline' ? (
          <OfflineEmptyState compact />
        ) : (
          <View style={{ paddingTop: 56, alignItems: 'center' }}>
            <Text style={{ textAlign: 'center', color: theme.colors.inkFaint, fontSize: 14, fontWeight: '500' }}>
              {/* 'data' + zero rendered cards = the search/project filter matched nothing. */}
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
