import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Camera, MoreHorizontal, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { PressBounce } from '../animations/PressBounce';
import { useTheme } from '../../lib/theme';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { imageForDisplay } from '../../lib/imageUrl';
import { MAX_SLIDE_PHOTOS, slideImagePath } from '../../lib/reportSlides';
import type { SlideImage } from '../../types/models';

interface SlidePhotoRowProps {
  /** 0–2 photos already on the slide. */
  images: SlideImage[];
  /** Index of the photo whose change/re-annotate upload is in flight (spinner). */
  uploadingIndex?: number | null;
  /** True while a brand-new photo is uploading (spinner on the add tile). */
  addingPhoto?: boolean;
  /** Tap an existing photo → opens the change / annotate / delete sheet. */
  onTapPhoto: (index: number) => void;
  /** Tap the dashed add tile → starts the pick flow for a new photo. */
  onAddPhoto: () => void;
}

/**
 * The per-slide photo strip in the report slide editor. Renders 0–2 photo tiles
 * plus a dashed "add" tile while under {@link MAX_SLIDE_PHOTOS}; once the cap is
 * reached the add tile simply isn't rendered (the cap is enforced by absence —
 * no disabled button, no error toast). Reads photos via `slideImages()` upstream.
 */
export function SlidePhotoRow({
  images,
  uploadingIndex = null,
  addingPhoto = false,
  onTapPhoto,
  onAddPhoto,
}: SlidePhotoRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const canAdd = images.length < MAX_SLIDE_PHOTOS;

  // Empty slide: one full-width dashed box (unchanged from the single-photo era).
  if (images.length === 0) {
    return (
      <AddTile full label="+ ფოტოს დამატება" busy={addingPhoto} onPress={onAddPhoto} styles={styles} theme={theme} />
    );
  }

  return (
    <View style={styles.row}>
      {images.map((img, i) => (
        <PhotoTile
          key={slideImagePath(img) ?? `empty-${i}`}
          image={img}
          uploading={uploadingIndex === i}
          onPress={() => onTapPhoto(i)}
          styles={styles}
          theme={theme}
        />
      ))}
      {canAdd ? (
        <AddTile label="+ მეორე ფოტო" busy={addingPhoto} onPress={onAddPhoto} styles={styles} theme={theme} />
      ) : null}
    </View>
  );
}

function PhotoTile({
  image,
  uploading,
  onPress,
  styles,
  theme,
}: {
  image: SlideImage;
  uploading: boolean;
  onPress: () => void;
  styles: any;
  theme: any;
}) {
  const path = slideImagePath(image);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUri(null);
      return;
    }
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
    <PressBounce scaleTo={0.97} hapticOnPress="light" style={styles.tile} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <ActivityIndicator color={theme.colors.inkFaint} />
      )}
      <View style={styles.dotsBadge}>
        <MoreHorizontal size={16} color={theme.colors.ink} strokeWidth={2} />
      </View>
      {uploading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.colors.white} />
        </View>
      ) : null}
    </PressBounce>
  );
}

function AddTile({
  full = false,
  label,
  busy,
  onPress,
  styles,
  theme,
}: {
  full?: boolean;
  label: string;
  busy: boolean;
  onPress: () => void;
  styles: any;
  theme: any;
}) {
  return (
    <PressBounce
      scaleTo={0.97}
      hapticOnPress="light"
      style={[styles.tile, styles.addTile, full && styles.addTileFull]}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.inkFaint} />
      ) : (
        <>
          {full ? (
            <Camera size={32} color={theme.colors.inkFaint} strokeWidth={1.5} />
          ) : (
            <Plus size={26} color={theme.colors.inkFaint} strokeWidth={1.75} />
          )}
          <Text style={styles.addLabel}>{label}</Text>
        </>
      )}
    </PressBounce>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    tile: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.subtleSurface,
    },
    addTile: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      backgroundColor: 'transparent',
    },
    addTileFull: { flex: undefined, width: '100%', aspectRatio: 16 / 9 },
    addLabel: { fontSize: 13, color: theme.colors.inkSoft, fontWeight: '600', textAlign: 'center' },
    dotsBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
