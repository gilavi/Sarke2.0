import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2, Image as ImageIcon, ChevronUp, ChevronDown } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { imageForDisplay } from '../../lib/imageUrl';
import { slideImagePath, slideImages } from '../../lib/reportSlides';
import type { ReportSlide } from '../../types/models';

/**
 * One row in the report slide list (`app/reports/[id]/edit.tsx`): swipe-to-delete,
 * thumbnail of the first photo with a count badge when the slide has 2, title +
 * description, and up/down reorder controls. Reads photos via `slideImages()`.
 */
export function ReportSlideCard({
  slide,
  index,
  total,
  onPress,
  onUp,
  onDown,
  onDelete,
}: {
  slide: ReportSlide;
  index: number;
  total: number;
  onPress: () => void;
  onUp: () => void;
  onDown: () => void;
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
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View style={styles.cardRow}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeText}>{index + 1}</Text>
          </View>

          <View style={styles.thumb}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <ImageIcon size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />
            )}
            {photoCount > 1 ? (
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountBadgeText}>{photoCount}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {slide.title || `სლაიდი ${index + 1}`}
            </Text>
            {slide.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {slide.description}
              </Text>
            ) : (
              <Text style={[styles.cardDescription, { fontStyle: 'italic', color: theme.colors.inkFaint }]}>
                აღწერა არ არის
              </Text>
            )}
          </View>

          <View style={styles.reorderStack}>
            <Pressable
              onPress={onUp}
              disabled={index === 0}
              hitSlop={10}
              style={({ pressed }) => [styles.reorderBtn, index === 0 && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
            >
              <ChevronUp size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
            </Pressable>
            <Pressable
              onPress={onDown}
              disabled={index === total - 1}
              hitSlop={10}
              style={({ pressed }) => [
                styles.reorderBtn,
                index === total - 1 && { opacity: 0.3 },
                pressed && { opacity: 0.6 },
              ]}
            >
              <ChevronDown size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    numberBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
    thumb: {
      width: 64,
      aspectRatio: 16 / 9,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoCountBadge: {
      position: 'absolute',
      bottom: 3,
      right: 3,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoCountBadgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '700' },
    cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    cardDescription: { fontSize: 12, color: theme.colors.inkSoft, lineHeight: 16 },
    reorderStack: { flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' },
    reorderBtn: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.subtleSurface,
    },
    swipeDelete: {
      width: 64,
      backgroundColor: theme.colors.danger,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
  });
}
