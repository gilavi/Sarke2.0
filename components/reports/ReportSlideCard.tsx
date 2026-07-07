import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2, Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useResolvedImageUris } from '../../hooks/useResolvedImageUris';
import { slideImagePaths, slideLayout } from '../../lib/reportSlides';
import type { ReportSlide } from '../../types/models';

/** Fixed card height — the reorder list relies on a deterministic row height. */
export const SLIDE_CARD_HEIGHT = 176;

/**
 * One row in the report slide list (`app/reports/[id]/edit.tsx`): a fixed-height
 * **slide thumbnail** that mirrors the slide's real layout (text+photo, big
 * photo, side-by-side, stacked) so the list reads as a deck of slides rather
 * than a plain list. Swipe to delete; long-press to drag (via the parent reorder
 * list). Resolves its own photos via `useResolvedImageUris`.
 */
export function ReportSlideCard({
  slide,
  index,
  dragging = false,
  onPress,
  onDelete,
}: {
  slide: ReportSlide;
  index: number;
  dragging?: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const uris = useResolvedImageUris(STORAGE_BUCKETS.reportPhotos, slideImagePaths(slide));
  const layout = slideLayout(slide);
  const title = slide.title || t('reports.slideTitleFallback', { n: index + 1 });
  const hasDesc = !!slide.description?.trim();

  let media: React.ReactNode;
  if (uris.length >= 2) {
    media =
      layout === 'two-stacked' ? (
        <View style={styles.stack}>
          <Thumb uri={uris[0]} style={styles.fill} theme={theme} />
          <Thumb uri={uris[1]} style={styles.fill} theme={theme} />
        </View>
      ) : (
        <View style={styles.duoRow}>
          <Thumb uri={uris[0]} style={styles.fill} theme={theme} />
          <Thumb uri={uris[1]} style={styles.fill} theme={theme} />
        </View>
      );
  } else if (uris.length === 1 && hasDesc) {
    // text-photo: description left, photo right.
    media = (
      <View style={styles.splitRow}>
        <Text style={styles.desc} numberOfLines={4}>{slide.description}</Text>
        <Thumb uri={uris[0]} style={styles.splitPhoto} theme={theme} />
      </View>
    );
  } else if (uris.length === 1) {
    media = <Thumb uri={uris[0]} style={styles.fill} theme={theme} />;
  } else {
    media = hasDesc ? (
      <Text style={styles.descOnly} numberOfLines={5}>{slide.description}</Text>
    ) : (
      <View style={[styles.fill, styles.emptyMedia]}>
        <ImageIcon size={24} color={theme.colors.inkFaint} strokeWidth={1.5} />
      </View>
    );
  }

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable onPress={onDelete} style={styles.swipeDelete} {...a11y(t('reports.deleteSlide'), t('reports.deleteSlideHint'), 'button')}>
          <Trash2 size={18} color={theme.colors.white} strokeWidth={1.5} />
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, dragging && styles.cardDragging, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.header}>
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{index + 1}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.media}>{media}</View>
      </Pressable>
    </Swipeable>
  );
}

function Thumb({ uri, style, theme }: { uri: string | null; style: any; theme: any }) {
  return (
    <View style={[styleThumbBase(theme), style]}>
      {uri ? (
        // expo-image: downsamples the decode to the layout box (RN Image decoded
        // the full 1600px upload) and adds memory+disk caching.
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={uri} />
      ) : (
        <ImageIcon size={22} color={theme.colors.inkFaint} strokeWidth={1.5} />
      )}
    </View>
  );
}

const styleThumbBase = (theme: any) => ({
  borderRadius: 10,
  overflow: 'hidden' as const,
  backgroundColor: theme.colors.subtleSurface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      height: SLIDE_CARD_HEIGHT,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      gap: 8,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    cardDragging: {
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      borderColor: theme.colors.borderStrong,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    numBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    media: { flex: 1 },
    fill: { flex: 1, width: '100%' },
    duoRow: { flex: 1, flexDirection: 'row', gap: 8 },
    stack: { flex: 1, gap: 8 },
    splitRow: { flex: 1, flexDirection: 'row', gap: 12 },
    splitPhoto: { width: '44%' },
    desc: { flex: 1, fontSize: 13, color: theme.colors.inkSoft, lineHeight: 19 },
    descOnly: { fontSize: 13, color: theme.colors.inkSoft, lineHeight: 20 },
    emptyMedia: {},
    swipeDelete: {
      width: 64,
      height: SLIDE_CARD_HEIGHT,
      backgroundColor: theme.colors.danger,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
  });
}
