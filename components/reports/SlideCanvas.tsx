import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import type { ReportSlideLayout } from '../../types/models';

interface Props {
  num: number;
  title: string;
  description: string;
  layout: ReportSlideLayout;
  /** Resolved display URIs aligned with the slide's photos (null = still loading). */
  uris: (string | null)[];
}

/**
 * Live, read-only preview of a report slide — a WYSIWYG mirror of how the slide
 * renders in the generated PDF (`lib/reportPdf.ts`), across all four layouts.
 * Driven entirely by the editor's live state so it updates as the user types or
 * swaps the layout. Not interactive; the photo tiles + inputs below it do the
 * editing.
 *
 * Content-fit modes mirror the PDF: `cover` for the side-by-side (text-photo,
 * duo) crops, `contain` for the full / stacked images (PDF uses `object-fit:
 * contain` there so nothing is cropped).
 */
export function SlideCanvas({ num, title, description, layout, uris }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const count = uris.length;
  const hasDesc = description.trim().length > 0;
  const displayTitle = title.trim() || t('reports.slideTitleFallback', { n: num });

  const NumBadge = (
    <View style={styles.numBadge}>
      <Text style={styles.numText}>{num}</Text>
    </View>
  );

  const Desc = hasDesc ? <Text style={styles.desc}>{description}</Text> : null;

  let body: React.ReactNode;

  if (count === 0) {
    body = (
      <>
        <View style={styles.header}>
          {NumBadge}
          <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>
        </View>
        {Desc}
      </>
    );
  } else if (count >= 2) {
    body = (
      <>
        <View style={styles.header}>
          {NumBadge}
          <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>
        </View>
        {Desc}
        {layout === 'two-stacked' ? (
          <View style={{ gap: 8 }}>
            <Photo uri={uris[0]} style={[styles.photo, styles.stacked]} contentFit="contain" theme={theme} />
            <Photo uri={uris[1]} style={[styles.photo, styles.stacked]} contentFit="contain" theme={theme} />
          </View>
        ) : (
          <View style={styles.row}>
            <Photo uri={uris[0]} style={[styles.photo, styles.duo]} contentFit="cover" theme={theme} />
            <Photo uri={uris[1]} style={[styles.photo, styles.duo]} contentFit="cover" theme={theme} />
          </View>
        )}
      </>
    );
  } else if (!hasDesc || layout === 'photo-full') {
    body = (
      <>
        <View style={styles.numRow}>{NumBadge}</View>
        <Photo uri={uris[0]} style={[styles.photo, styles.full]} contentFit="contain" theme={theme} />
        <Text style={styles.titleCentered}>{displayTitle}</Text>
        {Desc}
      </>
    );
  } else {
    body = (
      <>
        <View style={styles.header}>
          {NumBadge}
          <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>
        </View>
        <View style={styles.splitRow}>
          <View style={styles.splitText}>{Desc}</View>
          <Photo uri={uris[0]} style={[styles.photo, styles.splitPhoto]} contentFit="cover" theme={theme} />
        </View>
      </>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

/** Module-level so the <Image> instances are preserved across the editor's
 *  per-keystroke re-renders (an inline component remounts and reloads them). */
function Photo({
  uri,
  style,
  contentFit,
  theme,
}: {
  uri: string | null;
  style: any;
  contentFit: ImageContentFit;
  theme: any;
}) {
  return (
    <View style={style}>
      {uri ? (
        // expo-image: downsamples the decode to the layout box (RN Image decoded
        // the full 1600px upload) and adds memory+disk caching.
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} recyclingKey={uri} />
      ) : (
        <ImageIcon size={22} color={theme.colors.inkFaint} strokeWidth={1.5} />
      )}
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    numRow: { flexDirection: 'row' },
    numBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
    title: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    titleCentered: { fontSize: 14, fontWeight: '700', color: theme.colors.ink, textAlign: 'center' },
    desc: { fontSize: 13, color: theme.colors.inkSoft, lineHeight: 19 },
    photo: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    duo: { flex: 1, minWidth: 0, aspectRatio: 4 / 3 },
    stacked: { width: '100%', aspectRatio: 16 / 9 },
    full: { width: '100%', aspectRatio: 16 / 10 },
    splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    splitText: { width: '55%' },
    splitPhoto: { width: '40%', aspectRatio: 4 / 3 },
  });
}
