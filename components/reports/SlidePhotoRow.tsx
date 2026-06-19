import { useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Camera, MoreHorizontal, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { PressBounce } from '../animations/PressBounce';
import { useTheme } from '../../lib/theme';
import { MAX_SLIDE_PHOTOS, slideImagePath } from '../../lib/reportSlides';
import type { SlideImage } from '../../types/models';

interface SlidePhotoRowProps {
  /** 0–2 photos already on the slide. */
  images: SlideImage[];
  /** Resolved display URIs aligned with `images` (null = still loading). */
  uris: (string | null)[];
  /** Storage paths whose change/re-annotate upload is in flight (spinner overlay). */
  uploadingPaths?: Set<string>;
  /** True while a brand-new photo is uploading (spinner on the add affordance). */
  addingPhoto?: boolean;
  /** Tap an existing photo → opens the change / annotate / delete sheet. */
  onTapPhoto: (index: number) => void;
  /** Tap the add affordance → starts the pick flow for a new photo. */
  onAddPhoto: () => void;
}

/**
 * The per-slide photo controls in the slide editor. An empty slide shows one
 * large "add photo" tile (the expected primary action). Once there's a photo, it
 * becomes a thumbnail strip and the SECOND photo is offered as a slim, clearly
 * optional "+ მეორე ფოტო" button rather than a second equal-sized empty box — so
 * a single-photo slide never looks unfinished. The cap ({@link MAX_SLIDE_PHOTOS})
 * is enforced by the add affordance simply not rendering at 2 photos.
 */
export function SlidePhotoRow({
  images,
  uris,
  uploadingPaths,
  addingPhoto = false,
  onTapPhoto,
  onAddPhoto,
}: SlidePhotoRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const canAdd = images.length < MAX_SLIDE_PHOTOS;

  // Empty slide: one full-width dashed box — the primary "add a photo" action.
  if (images.length === 0) {
    return (
      <PressBounce scaleTo={0.98} hapticOnPress="light" style={[styles.tile, styles.addTileFull]} onPress={onAddPhoto}>
        {addingPhoto ? (
          <ActivityIndicator color={theme.colors.inkFaint} />
        ) : (
          <>
            <Camera size={32} color={theme.colors.inkFaint} strokeWidth={1.5} />
            <Text style={styles.addLabel}>+ ფოტოს დამატება</Text>
          </>
        )}
      </PressBounce>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionLabel}>ფოტოები</Text>
      <View style={styles.row}>
        {images.map((img, i) => {
          const path = slideImagePath(img);
          return (
            <PhotoTile
              key={path ?? `empty-${i}`}
              uri={uris[i] ?? null}
              uploading={!!path && !!uploadingPaths?.has(path)}
              onPress={() => onTapPhoto(i)}
              styles={styles}
              theme={theme}
            />
          );
        })}
      </View>

      {/* Second photo is optional — a slim secondary button, not a big empty slot. */}
      {canAdd ? (
        <PressBounce scaleTo={0.98} hapticOnPress="light" style={styles.addSecond} onPress={onAddPhoto}>
          {addingPhoto ? (
            <ActivityIndicator color={theme.colors.inkSoft} />
          ) : (
            <>
              <Plus size={18} color={theme.colors.inkSoft} strokeWidth={1.75} />
              <Text style={styles.addSecondLabel}>მეორე ფოტო</Text>
              <Text style={styles.optional}>არასავალდებულო</Text>
            </>
          )}
        </PressBounce>
      ) : null}
    </View>
  );
}

function PhotoTile({
  uri,
  uploading,
  onPress,
  styles,
  theme,
}: {
  uri: string | null;
  uploading: boolean;
  onPress: () => void;
  styles: any;
  theme: any;
}) {
  return (
    <PressBounce scaleTo={0.97} hapticOnPress="light" style={styles.photoTile} onPress={onPress}>
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

function makeStyles(theme: any) {
  return StyleSheet.create({
    sectionLabel: { fontSize: 12, color: theme.colors.inkFaint, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 10 },
    tile: {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.colors.subtleSurface,
    },
    addTileFull: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      backgroundColor: 'transparent',
    },
    addLabel: { fontSize: 13, color: theme.colors.inkSoft, fontWeight: '600' },
    photoTile: {
      width: 104,
      height: 104,
      borderRadius: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.subtleSurface,
    },
    addSecond: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      backgroundColor: 'transparent',
    },
    addSecondLabel: { fontSize: 13, color: theme.colors.inkSoft, fontWeight: '600' },
    optional: { fontSize: 11, color: theme.colors.inkFaint, fontWeight: '500' },
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
