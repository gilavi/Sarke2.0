// Combined camera + library picker. Live camera viewfinder at the top, a
// horizontal strip of recent photos at the bottom - capture or pick, one
// screen, one tap. Returns the chosen URIs via lib/photoPickerBus.
//
// Two modes (driven by the `?multi=1` query param the hook sets):
//   - single: one shutter capture / one strip tap / one library pick → [uri].
//   - multi:  pinch-to-zoom while capturing; recent-strip multi-select with a
//     "დასრულება (n)" bar; system-library multi-select. Resolves [uri1, uri2, …],
//     all of which skip annotation (only a live shutter capture is annotated).
//
// Pinch-to-zoom drives CameraView's `zoom` (0–1). Falls back to the system
// library picker (`launchImageLibraryAsync`) for the full Photos UI; degrades to
// library-only when camera permission is denied.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Images, Check, Camera } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

import {
  resolvePhotoPicker,
  cancelPhotoPicker,
  setLastPhotoFromCapture,
} from '../lib/photoPickerBus';

// Pinch sensitivity: a 2× finger spread adds ~0.5 to the 0–1 zoom range.
const ZOOM_SENSITIVITY = 0.5;
// Cap on a single system-library multi-pick.
const SELECTION_LIMIT = 10;
// CameraView zoom is 0–1; show it as a friendly 1.0×–5× factor.
const zoomLabel = (z: number) => `${(1 + z * 4).toFixed(1)}×`;

/**
 * iCloud-backed / ph:// URIs aren't readable by FileSystem - copy them to a
 * local cache file we can hand to fetch/upload. Pass-through for local URIs.
 */
async function toLocalUri(uri: string, id: string): Promise<string> {
  if (uri.startsWith('ph://') || uri.includes('icloud')) {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    const localCopy = `${dir}local_${id}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: localCopy });
    return localCopy;
  }
  return uri;
}

/** Resolve a recent-strip asset (MediaLibrary) to a readable local URI. */
async function resolveAssetUri(asset: MediaLibrary.Asset): Promise<string> {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  return toLocalUri(info.localUri ?? asset.uri, asset.id);
}

const MemoizedAssetItem = memo(function AssetItem({
  item,
  onPress,
  disabled,
  selectable,
  selectionIndex,
}: {
  item: MediaLibrary.Asset;
  onPress: (asset: MediaLibrary.Asset) => void;
  disabled: boolean;
  selectable: boolean;
  /** 1-based position in the selection, or 0 when not selected. */
  selectionIndex: number;
}) {
  const selected = selectionIndex > 0;
  return (
    <Pressable onPress={() => void onPress(item)} style={styles.thumb} disabled={disabled}>
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      {selectable && selected ? (
        <>
          <View style={styles.thumbSelectedOverlay} />
          <View style={styles.thumbCheck}>
            <Text style={styles.thumbCheckText}>{selectionIndex}</Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
});

export default function PhotoPickerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ multi?: string; skip?: string }>();
  const multiMode = params.multi === '1';
  // When the caller skips annotation, a pick won't trigger the annotator's
  // router.replace, so the picker must dismiss itself after resolving.
  const skipAnnotate = params.skip === '1';
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [libPerm, requestLibPerm] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  // Ordered selection of recent-strip asset ids (multi mode only).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const askedCamRef = useRef(false);
  const askedLibRef = useRef(false);

  // ── Pinch-to-zoom ──────────────────────────────────────────────────────────
  const zoom = useSharedValue(0); // live 0–1 (UI thread)
  const baseZoom = useSharedValue(0); // zoom captured at gesture start
  const pillOpacity = useSharedValue(0);
  const [zoomDisplay, setZoomDisplay] = useState(0); // drives CameraView prop + pill text

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          baseZoom.value = zoom.value;
        })
        .onUpdate((e) => {
          const next = Math.min(Math.max(baseZoom.value + (e.scale - 1) * ZOOM_SENSITIVITY, 0), 1);
          zoom.value = next;
          runOnJS(setZoomDisplay)(next);
          // Pulse the indicator visible, then fade it after the pinch settles.
          pillOpacity.value = withSequence(
            withTiming(1, { duration: 80 }),
            withDelay(900, withTiming(0, { duration: 350 })),
          );
        }),
    [baseZoom, zoom, pillOpacity],
  );

  const pillStyle = useAnimatedStyle(() => ({ opacity: pillOpacity.value }));

  const resetZoom = useCallback(() => {
    zoom.value = 0;
    baseZoom.value = 0;
    setZoomDisplay(0);
    pillOpacity.value = withTiming(0, { duration: 200 });
  }, [zoom, baseZoom, pillOpacity]);

  // Request camera + library permissions on mount, at most once per mount.
  // If the user dismisses the OS sheet (swipe-down) the permission stays
  // {granted:false, canAskAgain:true} - without this guard the effect would
  // re-fire and re-prompt indefinitely.
  useEffect(() => {
    if (askedCamRef.current) return;
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) {
      askedCamRef.current = true;
      void requestCamPerm();
    }
  }, [camPerm]);

  useEffect(() => {
    if (askedLibRef.current) return;
    if (libPerm && !libPerm.granted && libPerm.canAskAgain) {
      askedLibRef.current = true;
      void requestLibPerm();
    }
  }, [libPerm]);

  // Load the most recent ~50 photos from the user's library once we have
  // permission. They render as small square thumbnails below the camera.
  useEffect(() => {
    if (!libPerm?.granted) return;
    (async () => {
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: 50,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          mediaType: MediaLibrary.MediaType.photo,
        });
        setAssets(page.assets);
      } catch {
        // Library read failure is non-fatal - user can still use camera.
      }
    })();
  }, [libPerm?.granted]);

  // Use router.dismiss() (modal-aware close) instead of router.back(). back()
  // emits a GO_BACK action that the AuthGate listener intercepts and redirects
  // to /home - sending the user to the dashboard after every capture.
  // Guard with canDismiss() first: dismiss() throws a "POP was not handled"
  // error when the modal stack has nothing to pop (e.g. opened via deep link).
  const close = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [router]);

  // Resolve the picker with the chosen URIs. `fromCapture` tells the hook whether
  // to route a single result through the annotator (live capture) or add directly.
  const finish = useCallback((uris: string[], fromCapture: boolean) => {
    setLastPhotoFromCapture(fromCapture);
    resolvePhotoPicker(uris);
    // For a live capture in single mode, photo-annotate replaces this screen via
    // router.replace(); otherwise the pushing screen closes us.
  }, []);

  const cancel = useCallback(() => {
    cancelPhotoPicker();
    close();
  }, [close]);

  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        finish([photo.uri], true);
        // A live capture is annotated (and the annotator replaces this screen) UNLESS
        // the caller skips annotation - in which case the hook adds it directly and we
        // must dismiss ourselves.
        if (skipAnnotate) close();
      }
      resetZoom(); // next shot starts wide
    } catch (e) {
      console.warn('[photo-picker] capture failed', e);
    } finally {
      setCapturing(false);
    }
  }, [capturing, close, finish, resetZoom, skipAnnotate]);

  // Single-mode strip tap: resolve immediately with the one chosen photo.
  const pickAsset = useCallback(
    async (asset: MediaLibrary.Asset) => {
      if (selecting) return;
      setSelecting(true);
      try {
        const uri = await resolveAssetUri(asset);
        finish([uri], false);
        // Single-mode strip pick: annotated unless the caller skips it, in which case
        // the hook resolves directly (no replace) so we dismiss ourselves.
        if (skipAnnotate) close();
      } finally {
        setSelecting(false);
      }
    },
    [close, finish, selecting, skipAnnotate],
  );

  // Multi-mode strip tap: toggle the asset in the ordered selection.
  const toggleSelect = useCallback((asset: MediaLibrary.Asset) => {
    setSelectedIds((prev) =>
      prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id],
    );
  }, []);

  // Multi-mode "Done (n)": resolve every selected strip asset (ph:// → local).
  const commitSelection = useCallback(async () => {
    if (selecting || selectedIds.length === 0) return;
    setSelecting(true);
    try {
      const byId = new Map(assets.map((a) => [a.id, a]));
      const uris: string[] = [];
      for (const id of selectedIds) {
        const asset = byId.get(id);
        if (!asset) continue;
        uris.push(await resolveAssetUri(asset));
      }
      if (uris.length === 0) {
        setSelecting(false);
        return;
      }
      finish(uris, false);
      // A batch never routes to the annotator (no router.replace), so dismiss here.
      close();
    } finally {
      setSelecting(false);
    }
  }, [assets, close, finish, selectedIds, selecting]);

  const openSystemLibrary = useCallback(async () => {
    if (selecting) return;
    setSelecting(true);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: false,
        allowsMultipleSelection: multiMode,
        selectionLimit: multiMode ? SELECTION_LIMIT : 1,
      });
      if (r.canceled || !r.assets?.length) {
        setSelecting(false);
        return;
      }
      // Resolve iCloud/ph:// URIs for EVERY asset, not just the first.
      const uris: string[] = [];
      for (let i = 0; i < r.assets.length; i++) {
        const a = r.assets[i];
        if (!a?.uri) continue;
        uris.push(await toLocalUri(a.uri, a.assetId ?? `lib_${Date.now()}_${i}`));
      }
      if (uris.length === 0) {
        setSelecting(false);
        return;
      }
      finish(uris, false);
      // The hook adds these directly (no annotator) when it's a multi-mode batch OR an
      // annotation-skipping caller - in both cases it won't replace this screen, so we
      // dismiss it. A single-mode annotated pick is replaced by the annotator instead.
      if (multiMode || skipAnnotate) close();
    } catch {
      setSelecting(false);
    }
  }, [close, finish, multiMode, selecting, skipAnnotate]);

  const selectionIndexFor = useCallback(
    (id: string) => selectedIds.indexOf(id) + 1,
    [selectedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset }) => (
      <MemoizedAssetItem
        item={item}
        onPress={multiMode ? toggleSelect : pickAsset}
        disabled={multiMode ? false : selecting}
        selectable={multiMode}
        selectionIndex={multiMode ? selectionIndexFor(item.id) : 0}
      />
    ),
    [multiMode, pickAsset, selecting, selectionIndexFor, toggleSelect],
  );

  const camReady = camPerm?.granted ?? false;
  const camDeniedFinal = camPerm && !camPerm.granted && !camPerm.canAskAgain;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Camera viewfinder - pinch-to-zoom wraps ONLY this area so it never fights
          the horizontal recent-photos strip below. */}
      <GestureDetector gesture={pinch}>
        <View style={styles.cameraWrap}>
          {camReady ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing="back"
              zoom={zoomDisplay}
            />
          ) : camDeniedFinal ? (
            <View style={styles.permPlaceholder}>
              <Camera size={36} color="#fff" strokeWidth={1.5} />
              <Text style={styles.permText}>კამერაზე წვდომა აკრძალულია</Text>
              <Pressable onPress={() => void Linking.openSettings()} style={styles.permButton}>
                <Text style={styles.permButtonText}>პარამეტრების გახსნა</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.permPlaceholder}>
              <ActivityIndicator color="#fff" />
            </View>
          )}

          {/* Zoom indicator pill - fades out when idle. */}
          {camReady ? (
            <Animated.View style={[styles.zoomPill, pillStyle]} pointerEvents="none">
              <Text style={styles.zoomPillText}>{zoomLabel(zoomDisplay)}</Text>
            </Animated.View>
          ) : null}

          {/* Top bar: cancel + system-library shortcut */}
          <View style={styles.topBar} pointerEvents="box-none">
            <Pressable onPress={cancel} hitSlop={12} style={styles.iconBtn}>
              <X size={22} color="#fff" strokeWidth={1.5} />
            </Pressable>
            <Pressable onPress={openSystemLibrary} hitSlop={12} style={styles.libraryShortcut}>
              <Images size={18} color="#fff" strokeWidth={1.5} />
              <Text style={styles.libraryShortcutText}>ბიბლიოთეკა</Text>
            </Pressable>
          </View>

          {/* Shutter */}
          {camReady ? (
            <Pressable
              onPress={capture}
              disabled={capturing}
              style={({ pressed }) => [
                styles.shutter,
                pressed && { transform: [{ scale: 0.94 }] },
                capturing && { opacity: 0.6 },
              ]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          ) : null}

          {/* Multi-select commit bar */}
          {multiMode && selectedIds.length > 0 ? (
            <Pressable
              onPress={() => void commitSelection()}
              disabled={selecting}
              style={({ pressed }) => [
                styles.doneBar,
                { backgroundColor: theme.colors.accent },
                pressed && { opacity: 0.85 },
                selecting && { opacity: 0.6 },
              ]}
            >
              <Check size={18} color="#fff" strokeWidth={1.5} />
              <Text style={styles.doneBarText}>დასრულება ({selectedIds.length})</Text>
            </Pressable>
          ) : null}
        </View>
      </GestureDetector>

      {/* Library thumbnails strip */}
      <View style={styles.libraryStrip}>
        {!libPerm?.granted ? (
          <View style={styles.libraryEmpty}>
            <Text style={styles.libraryEmptyText}>
              ბიბლიოთეკაზე წვდომა საჭიროა გასაჭრელად
            </Text>
            {libPerm && !libPerm.canAskAgain ? (
              <Pressable onPress={() => void Linking.openSettings()} style={styles.permButton}>
                <Text style={styles.permButtonText}>პარამეტრების გახსნა</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => void requestLibPerm()} style={styles.permButton}>
                <Text style={styles.permButtonText}>წვდომის მიცემა</Text>
              </Pressable>
            )}
          </View>
        ) : assets.length === 0 ? (
          <View style={styles.libraryEmpty}>
            <ActivityIndicator color={theme.colors.inkSoft} />
          </View>
        ) : (
          <FlatList
            horizontal
            data={assets}
            keyExtractor={a => a.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 12 }}
            renderItem={renderItem}
            extraData={selectedIds}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  libraryShortcutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  zoomPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  zoomPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  shutter: {
    marginBottom: 32,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  doneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  permPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  permText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  permButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  libraryStrip: {
    height: 110,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  libraryEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  libraryEmptyText: { color: '#bbb', fontSize: 13, textAlign: 'center' },
  thumb: {
    width: 86,
    height: 86,
    borderRadius: 8,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  thumbSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumbCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: '#147A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCheckText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
