import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { PressBounce } from '../../components/animations/PressBounce';
import { Skeleton } from '../../components/Skeleton';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { Report } from '../../types/models';
import { ReportCard, REPORT_CARD_WIDTH } from './ReportCard';

/**
 * Horizontal rail of report `ReportCard`s for the section surfaces (Home reports
 * widget, project-detail reports section). Renders the canonical three states
 * (skeleton / empty copy / cards) and an optional trailing "view all" card when
 * there are more reports than `maxCards`.
 *
 * Full-bleed scrolling: `bleed` is the total horizontal padding of the enclosing
 * containers — the rail cancels it with a negative margin so cards scroll
 * **edge to edge to the screen**. `gutter` is where the first/last card rest;
 * set it equal to the page gutter (20) so cards line up flush with the section
 * header and the flat list rows. The host supplies the header; this is only the
 * scroller, so it stays reusable.
 */
export function ReportCardRail({
  reports,
  onPressReport,
  loading = false,
  emptyText,
  onViewAll,
  maxCards = 8,
  bleed = 16,
  gutter = 16,
}: {
  reports: Report[];
  onPressReport: (report: Report) => void;
  loading?: boolean;
  emptyText: string;
  onViewAll?: () => void;
  maxCards?: number;
  bleed?: number;
  gutter?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const shown = reports.slice(0, maxCards);
  const showViewAll = !!onViewAll && reports.length > shown.length;

  const railStyle = { marginHorizontal: -bleed, marginTop: 12 };
  const contentStyle = { paddingHorizontal: gutter, gap: 12, paddingBottom: 4 };

  if (loading && reports.length === 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={railStyle}
        contentContainerStyle={contentStyle}
        scrollEnabled={false}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ width: REPORT_CARD_WIDTH, gap: 8 }}>
            <Skeleton width={REPORT_CARD_WIDTH} height={Math.round(REPORT_CARD_WIDTH * 0.66)} radius={12} />
            <Skeleton width={'80%'} height={13} />
            <Skeleton width={'45%'} height={11} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={[styles.empty, { paddingHorizontal: gutter }]}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={railStyle}
      contentContainerStyle={contentStyle}
    >
      {shown.map((r) => (
        <ReportCard key={r.id} report={r} onPress={() => onPressReport(r)} />
      ))}
      {showViewAll ? (
        <PressBounce
          scaleTo={0.97}
          hapticOnPress="light"
          style={styles.viewAll}
          onPress={onViewAll}
          {...a11y('ყველას ნახვა', 'ყველა რეპორტის ნახვა', 'button')}
        >
          <View style={styles.viewAllIcon}>
            <ArrowRight size={20} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <Text style={styles.viewAllText}>ყველას ნახვა</Text>
        </PressBounce>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    empty: { paddingVertical: 18, alignItems: 'center' },
    emptyText: { fontSize: 13, color: theme.colors.inkFaint, fontWeight: '500' },
    viewAll: {
      width: 104,
      height: Math.round(REPORT_CARD_WIDTH * 0.66),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    viewAllIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
}
