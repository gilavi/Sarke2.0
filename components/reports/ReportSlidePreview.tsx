import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { imageForDisplay } from '../../lib/imageUrl';
import { slideImagePaths } from '../../lib/reportSlides';
import type { ReportSlide } from '../../types/models';

/**
 * Read-only preview card for one report slide on the report detail screen.
 * Renders the slide's 1–2 photos in a row (matching the editor) plus title and
 * description. Photos are read via `slideImagePaths()` — never the raw fields.
 */
export function ReportSlidePreview({ slide, index }: { slide: ReportSlide; index: number }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const paths = slideImagePaths(slide);

  return (
    <View style={styles.slideRow}>
      <View style={styles.slideHeader}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberBadgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.slideTitle} numberOfLines={1}>
          {slide.title || t('reports.slideTitleFallback', { n: index + 1 })}
        </Text>
      </View>
      {paths.length > 0 ? (
        <View style={styles.imagesRow}>
          {paths.map((p, i) => (
            <SlideThumb key={`${p}-${i}`} path={p} styles={styles} />
          ))}
        </View>
      ) : null}
      {slide.description ? <Text style={styles.description}>{slide.description}</Text> : null}
    </View>
  );
}

function SlideThumb({ path, styles }: { path: string; styles: any }) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await imageForDisplay(STORAGE_BUCKETS.reportPhotos, path);
        if (!cancelled) setUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <View style={styles.imageWrap}>
      {uri ? (
        // expo-image: downsamples the decode to the layout box (RN Image decoded
        // the full 1600px upload) and adds memory+disk caching.
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" recyclingKey={path} />
      ) : null}
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    slideRow: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    slideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    numberBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
    slideTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    imagesRow: { flexDirection: 'row', gap: 8 },
    imageWrap: {
      flex: 1,
      aspectRatio: 16 / 9,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
    },
    description: { fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
  });
}
