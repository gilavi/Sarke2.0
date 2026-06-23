import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { FileText, Layers } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { PressBounce } from '../../components/animations/PressBounce';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Report } from '../../types/models';
import { useReportCoverUri } from './useReportCover';

/** Default card width for the horizontal rail. Grids override via `width`. */
export const REPORT_CARD_WIDTH = 156;

/**
 * A report as a media card instead of a list row: a landscape cover photo
 * ("sneak peek" of the first photo inside the report) with a slide-count chip,
 * over the title + date. The cover reads at a glance so a rail/grid of reports
 * is scannable by content, not just by name. Width is fixed for the rail and
 * overridable for the 2-column grid. Pure presentational — caller owns nav.
 */
export function ReportCard({
  report,
  onPress,
  width = REPORT_CARD_WIDTH,
}: {
  report: Report;
  onPress: () => void;
  width?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const uri = useReportCoverUri(report);
  const coverHeight = Math.round(width * 0.66);
  const slideCount = report.slides?.length ?? 0;
  // No cover photo → peek at the text inside (first slide's title + body) so a
  // photo-less report still previews its content instead of a bare icon.
  const peek = useMemo(() => firstTextPeek(report), [report]);

  return (
    <PressBounce
      scaleTo={0.97}
      hapticOnPress="light"
      style={[styles.card, { width }]}
      onPress={onPress}
      {...a11y(report.title, 'რეპორტის ნახვა', 'button')}
    >
      <View style={[styles.cover, { height: coverHeight }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : peek.heading || peek.body ? (
          <View style={styles.coverPage}>
            <FileText size={13} color={theme.colors.accent} strokeWidth={1.5} style={{ marginBottom: 4 }} />
            {peek.heading ? (
              <Text style={styles.peekHeading} numberOfLines={1}>{peek.heading}</Text>
            ) : null}
            {peek.body ? (
              <Text style={styles.peekBody} numberOfLines={3}>{peek.body}</Text>
            ) : null}
          </View>
        ) : (
          <FileText size={Math.round(coverHeight * 0.32)} color={theme.colors.accent} strokeWidth={1.5} />
        )}
        {slideCount > 0 ? (
          <View style={styles.countChip}>
            <Layers size={11} color={theme.colors.white} strokeWidth={2} />
            <Text style={styles.countChipText}>{slideCount}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{report.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>{formatShortDateTime(report.created_at)}</Text>
    </PressBounce>
  );
}

/** First slide carrying any text → its title/description, for the photo-less peek. */
function firstTextPeek(report: Report): { heading: string; body: string } {
  const ordered = [...(report.slides ?? [])].sort((a, b) => a.order - b.order);
  for (const s of ordered) {
    const heading = (s.title ?? '').trim();
    const body = (s.description ?? '').trim();
    if (heading || body) return { heading, body };
  }
  return { heading: '', body: '' };
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: { backgroundColor: 'transparent' },
    cover: {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverPage: {
      ...StyleSheet.absoluteFillObject,
      padding: 10,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    peekHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.ink,
      marginBottom: 3,
    },
    peekBody: {
      fontSize: 10,
      lineHeight: 13,
      color: theme.colors.inkSoft,
    },
    countChip: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 11,
    },
    countChipText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
      marginTop: 8,
      lineHeight: 17,
    },
    meta: {
      fontSize: 11,
      color: theme.colors.inkFaint,
      marginTop: 3,
    },
  });
}
