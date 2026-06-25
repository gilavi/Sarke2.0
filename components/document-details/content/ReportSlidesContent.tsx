// ReportSlidesContent — the "report" content: a horizontal thumbnail strip of
// the report's slides. Tapping a slide opens the full slide screen
// (/reports/[id]/slide/[slideId]). Each card lazily resolves the slide's first
// photo to a display URL (falls back to a glyph placeholder).
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';
import { A11yText as Text } from '../../primitives/A11yText';
import { useTheme, type Theme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { slideImagePaths } from '../../../lib/reportSlides';
import type { ReportSlide } from '../../../types/models';

interface Props {
  slides: ReportSlide[];
  onOpenSlide: (slideId: string) => void;
}

function SlideThumbCard({
  slide,
  index,
  onPress,
}: {
  slide: ReportSlide;
  index: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [uri, setUri] = useState<string | null>(null);

  const path = useMemo(() => slideImagePaths(slide)[0] ?? null, [slide]);

  useEffect(() => {
    if (!path) {
      setUri(null);
      return;
    }
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.reportPhotos, path)
      .then((u) => { if (!cancelled) setUri(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      {...a11y(slide.title || String(index + 1), undefined, 'button')}
    >
      <View style={styles.thumb}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <FileText size={22} color={theme.colors.accent} strokeWidth={1.5} />
        )}
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {slide.title || ' '}
      </Text>
    </Pressable>
  );
}

export function ReportSlidesContent({ slides, onOpenSlide }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const ordered = useMemo(() => slides.slice().sort((a, b) => a.order - b.order), [slides]);

  if (ordered.length === 0) {
    return <Text style={styles.empty}>{t('details.content.empty')}</Text>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ordered.map((s, i) => (
        <SlideThumbCard key={s.id} slide={s} index={i} onPress={() => onOpenSlide(s.id)} />
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: { gap: 12, paddingVertical: 2, paddingRight: 8 },
    card: { width: 158 },
    cardPressed: { opacity: 0.85 },
    thumb: {
      width: 158,
      height: 100,
      borderRadius: 12,
      backgroundColor: theme.colors.accentSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    numBadge: {
      position: 'absolute',
      top: 6,
      right: 8,
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    title: { fontSize: 13, fontWeight: '600', color: theme.colors.ink, marginTop: 7 },
    empty: { fontSize: 14, color: theme.colors.inkFaint, paddingHorizontal: 4 },
  });
}
