import { type ReactElement } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { Skeleton } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';
import type { Report } from '../../types/models';
import { ReportCard } from './ReportCard';

const H_PADDING = 16;
const GAP = 12;

/**
 * Full-screen 2-column grid of report `ReportCard`s — the browse layout for the
 * History reports tab and a project's "all reports" list. Same card as the
 * section rails, just laid out to fill the screen. Carries the canonical
 * three-state guard (skeleton until the query produces a real answer, per-type
 * empty copy once it settles `[]`, cards otherwise) plus pull-to-refresh.
 */
export function ReportCardGrid({
  reports,
  onPressReport,
  query,
  refreshQueries,
  emptyText,
  ListHeaderComponent,
}: {
  reports: Report[];
  onPressReport: (report: Report) => void;
  query: { isFetching: boolean; isFetched: boolean };
  emptyText: string;
  refreshQueries?: unknown[];
  ListHeaderComponent?: ReactElement | null;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
  // Canonical three-state guard (see CLAUDE.md): never flash empty over a stale [].
  const loading = (query.isFetching || !query.isFetched) && reports.length === 0;

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
        <ReportCard report={item} width={cardWidth} onPress={() => onPressReport(item)} />
      )}
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
      ListEmptyComponent={
        loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: cardWidth, gap: 8 }}>
                <Skeleton width={cardWidth} height={Math.round(cardWidth * 0.66)} radius={12} />
                <Skeleton width={'80%'} height={13} />
                <Skeleton width={'45%'} height={11} />
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
