import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2, Image as ImageIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { imageForDisplay } from '../../lib/imageUrl';
import { slideImagePath, slideImages } from '../../lib/reportSlides';
import type { ReportSlide } from '../../types/models';

/** Fixed card height — the reorder list relies on a deterministic row height. */
export const SLIDE_CARD_HEIGHT = 104;

/**
 * One row in the report slide list (`app/reports/[id]/edit.tsx`): a large photo
 * thumbnail with the slide number overlaid, title + description, swipe-to-delete,
 * and (via the parent reorder list) long-press-to-drag. Reorder chevrons were
 * removed in favour of drag. Reads photos via `slideImages()`.
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
  /** True while this card is being dragged — lifts it with a stronger shadow. */
  dragging?: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const imgs = slideImages(slide);
  const imagePath = imgs[0] ? slideImagePath(imgs[0]) : null;
  const photoCount = imgs.length;
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setThumbUri(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await imageForDisplay(STORAGE_BUCKETS.reportPhotos, imagePath);
        if (!cancelled) setThumbUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable onPress={onDelete} style={styles.swipeDelete} {...a11y('წაშლა', 'სლაიდის წაშლა', 'button')}>
          <Trash2 size={18} color={theme.colors.white} strokeWidth={1.5} />
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, dragging && styles.cardDragging, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.thumb}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <ImageIcon size={26} color={theme.colors.inkFaint} strokeWidth={1.5} />
          )}
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{index + 1}</Text>
          </View>
          {photoCount > 1 ? (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountBadgeText}>{photoCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {slide.title || `სლაიდი ${index + 1}`}
          </Text>
          {slide.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {slide.description}
            </Text>
          ) : (
            <Text style={[styles.cardDescription, styles.cardDescriptionEmpty]}>აღწერა არ არის</Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      height: SLIDE_CARD_HEIGHT,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
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
    thumb: {
      width: 96,
      height: 72,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadge: {
      position: 'absolute',
      top: 5,
      left: 5,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
    photoCountBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoCountBadgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '700' },
    body: { flex: 1, paddingTop: 2, gap: 4 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink, lineHeight: 22 },
    cardDescription: { fontSize: 13, fontWeight: '400', color: theme.colors.inkSoft, lineHeight: 18 },
    cardDescriptionEmpty: { fontStyle: 'italic', color: theme.colors.inkFaint },
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
