// Combined camera + library picker. Live camera viewfinder at the top, a
// horizontal strip of recent photos at the bottom — capture or pick, one
// screen, one tap. Returns the chosen URI via lib/photoPickerBus.
//
// Falls back to the system library picker (`launchImageLibraryAsync`) for
// users who want the full Photos UI; degrades to library-only when camera
// permission is denied.
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '../lib/theme';

import { resolvePhotoPicker, cancelPhotoPicker } from '../lib/photoPickerBus';

const MemoizedAssetItem = memo(function AssetItem({ item, onPress, disabled }: { item: MediaLibrary.Asset; onPress: (asset: MediaLibrary.Asset) => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={() => void onPress(item)}
      style={styles.thumb}
      disabled={disabled}
    >
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} />
    </Pressable>
  );
});

export default function PhotoPickerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [libPerm, requestLibPerm] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const askedCamRef = useRef(false);
  const askedLibRef = useRef(false);

  // Request camera + library permissions on mount, at most once per mount.
  // If the user dismisses the OS sheet (swipe-down) the permission stays
  // {granted:false, canAskAgain:true} — without this guard the effect would
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
        // Library read failure is non-fatal — user can still use camera.
      }
    })();
  }, [libPerm?.granted]);

  // Use router.dismiss() (modal-aware close) instead of router.back(). back()
  // emits a GO_BACK action that the AuthGate __unsafe_action__ listener
  // (app/_layout.tsx) intercepts and redirects to /home — sending the user to
  // the dashboard after every capture.
  const close = useCallback(() => {
    try {
      router.dismiss();
    } catch {
      if (router.canGoBack()) router.back();
    }
  }, [router]);

  const finish = useCallback(
    (uri: string) => {
      resolvePhotoPicker(uri);
      // photo-annotate will replace this screen via router.replace()
    },
    [],
  );

  const cancel = useCallback(() => {
    cancelPhotoPicker();
    close();
  }, [close]);

  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) finish(photo.uri);
    } catch (e) {
      console.warn('[photo-picker] capture failed', e);
    } finally {
      setCapturing(false);
    }
  }, [capturing, finish]);

  const pickAsset = useCallback(
    async (asset: MediaLibrary.Asset) => {
      if (selecting) return;
      setSelecting(true);
      try {
        // iCloud-backed thumbnails need an explicit info fetch to surface a
        // local URI we can hand to fetch/upload.
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const uri = info.localUri ?? asset.uri;
        finish(uri);
      } finally {
        setSelecting(false);
      }
    },
    [finish, selecting],
  );

  const openSystemLibrary = useCallback(async () => {
    if (selecting) return;
    setSelecting(true);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: false,
      });
      if (r.canceled || !r.assets?.[0]?.uri) {
        setSelecting(false);
        return;
      }
      finish(r.assets[0].uri);
    } catch {
      setSelecting(false);
    }
  }, [finish, selecting]);

  const renderItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => (
    <MemoizedAssetItem item={item} onPress={pickAsset} disabled={selecting} />
  ), [pickAsset, selecting]);

  const camReady = camPerm?.granted ?? false;
  const camDeniedFinal = camPerm && !camPerm.granted && !camPerm.canAskAgain;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Camera viewfinder */}
      <View style={styles.cameraWrap}>
        {camReady ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
        ) : camDeniedFinal ? (
          <View style={styles.permPlaceholder}>
            <Ionicons name="camera-outline" size={36} color="#fff" />
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

        {/* Top bar: cancel + system-library shortcut */}
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable onPress={cancel} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={openSystemLibrary} hitSlop={12} style={styles.libraryShortcut}>
            <Ionicons name="images-outline" size={18} color="#fff" />
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
      </View>

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
});
